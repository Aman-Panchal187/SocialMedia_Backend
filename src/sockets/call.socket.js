import crypto from 'crypto';
import { getIO } from '../config/socket.js';
import logger from '../config/logger.js';
import { isUserOnline } from './presence.socket.js';
import { findMutualFollow } from '../modules/chat/chat.repository.js';
import { findUserByUsername, findUserById } from '../modules/users/users.repository.js';
import { createCallRecord } from '../modules/calls/calls.repository.js';

const RING_TIMEOUT_MS = 45000;

const activeCalls = new Map();
const userActiveCall = new Map();

const emitError = (socket, message) => {
  socket.emit('call:error', { message });
};

const cleanup = (callId) => {
  const record = activeCalls.get(callId);
  if (record?.timeoutHandle) clearTimeout(record.timeoutHandle);
  activeCalls.delete(callId);
  if (record) {
    if (userActiveCall.get(record.callerId) === callId) userActiveCall.delete(record.callerId);
    if (userActiveCall.get(record.calleeId) === callId) userActiveCall.delete(record.calleeId);
  }
};

const serializeUser = (user) => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
});

const otherPartyId = (record, userId) => (record.callerId === userId ? record.calleeId : record.callerId);

const isParticipant = (record, userId) => record.callerId === userId || record.calleeId === userId;

const persistUnanswered = (record, status) =>
  createCallRecord({
    callerId: record.callerId,
    calleeId: record.calleeId,
    callType: record.callType,
    status,
    startedAt: null,
    endedAt: new Date(),
    durationSec: null,
  });

export const registerCallHandlers = (io, socket) => {
  socket.on('call:invite', async (payload, ack) => {
    const sendAck = (response) => {
      if (typeof ack === 'function') ack(response);
    };

    try {
      const calleeUsername = payload?.calleeUsername;
      const { callType } = payload || {};

      if (callType !== 'voice' && callType !== 'video') {
        emitError(socket, 'callType must be voice or video');
        return;
      }

      const callee = await findUserByUsername(calleeUsername);
      if (!callee) {
        emitError(socket, 'User not found');
        return;
      }

      if (callee.id === socket.userId) {
        emitError(socket, 'You cannot call yourself');
        return;
      }

      const mutual = await findMutualFollow(socket.userId, callee.id);
      if (!mutual) {
        emitError(socket, 'You can only call mutual followers');
        return;
      }

      if (!isUserOnline(callee.id)) {
        emitError(socket, `${callee.username} is offline`);
        return;
      }

      if (userActiveCall.has(socket.userId) || userActiveCall.has(callee.id)) {
        socket.emit('call:busy', { calleeId: callee.id });
        return;
      }

      const caller = await findUserById(socket.userId);
      const callId = crypto.randomUUID();

      const record = {
        callerId: socket.userId,
        calleeId: callee.id,
        callType,
        status: 'ringing',
        startedInviteAt: Date.now(),
        answeredAt: null,
        timeoutHandle: null,
      };

      record.timeoutHandle = setTimeout(async () => {
        try {
          await persistUnanswered(record, 'missed');
          getIO().to(`user:${record.callerId}`).emit('call:timeout', { callId });
          getIO().to(`user:${record.calleeId}`).emit('call:timeout', { callId });
        } catch (err) {
          logger.error(`Failed to persist call timeout for call:${callId}: ${err.message}`);
        } finally {
          cleanup(callId);
        }
      }, RING_TIMEOUT_MS);

      activeCalls.set(callId, record);
      userActiveCall.set(socket.userId, callId);
      userActiveCall.set(callee.id, callId);

      // Acked so the caller learns callId immediately — otherwise they'd have no
      // way to reference this call for call:cancel until call:accepted fires,
      // which only happens if the callee answers (never, if they're cancelling
      // a still-ringing call).
      sendAck({ callId });

      getIO()
        .to(`user:${callee.id}`)
        .emit('call:incoming', { callId, callType, caller: serializeUser(caller) });
    } catch (err) {
      logger.error(`call:invite failed for user:${socket.userId}: ${err.message}`);
      emitError(socket, 'Failed to place call');
    }
  });

  socket.on('call:accept', (payload) => {
    try {
      const { callId } = payload || {};
      const record = activeCalls.get(callId);

      if (!record || record.status !== 'ringing' || socket.userId !== record.calleeId) {
        emitError(socket, 'Call cannot be accepted');
        return;
      }

      clearTimeout(record.timeoutHandle);
      record.timeoutHandle = null;
      record.status = 'active';
      record.answeredAt = Date.now();

      getIO().to(`user:${record.callerId}`).emit('call:accepted', { callId });
    } catch (err) {
      logger.error(`call:accept failed for user:${socket.userId}: ${err.message}`);
      emitError(socket, 'Failed to accept call');
    }
  });

  socket.on('call:reject', async (payload) => {
    try {
      const { callId } = payload || {};
      const record = activeCalls.get(callId);

      if (!record || socket.userId !== record.calleeId) {
        emitError(socket, 'Call cannot be rejected');
        return;
      }

      clearTimeout(record.timeoutHandle);

      await createCallRecord({
        callerId: record.callerId,
        calleeId: record.calleeId,
        callType: record.callType,
        status: 'rejected',
        startedAt: null,
        endedAt: new Date(),
        durationSec: null,
      });

      getIO().to(`user:${record.callerId}`).emit('call:rejected', { callId });
      cleanup(callId);
    } catch (err) {
      logger.error(`call:reject failed for user:${socket.userId}: ${err.message}`);
      emitError(socket, 'Failed to reject call');
    }
  });

  socket.on('call:cancel', async (payload) => {
    try {
      const { callId } = payload || {};
      const record = activeCalls.get(callId);

      if (!record || socket.userId !== record.callerId || record.status !== 'ringing') {
        emitError(socket, 'Call cannot be cancelled');
        return;
      }

      clearTimeout(record.timeoutHandle);
      await persistUnanswered(record, 'missed');

      getIO().to(`user:${record.calleeId}`).emit('call:cancelled', { callId });
      cleanup(callId);
    } catch (err) {
      logger.error(`call:cancel failed for user:${socket.userId}: ${err.message}`);
      emitError(socket, 'Failed to cancel call');
    }
  });

  const relay = (eventName) => (payload) => {
    try {
      const { callId } = payload || {};
      const record = activeCalls.get(callId);

      if (!record || !isParticipant(record, socket.userId)) {
        emitError(socket, 'Call not found');
        return;
      }

      const targetId = otherPartyId(record, socket.userId);
      getIO().to(`user:${targetId}`).emit(eventName, payload);
    } catch (err) {
      logger.error(`${eventName} relay failed for user:${socket.userId}: ${err.message}`);
    }
  };

  socket.on('call:offer', relay('call:offer'));
  socket.on('call:answer', relay('call:answer'));
  socket.on('call:ice-candidate', relay('call:ice-candidate'));

  socket.on('call:end', async (payload) => {
    try {
      const { callId } = payload || {};
      const record = activeCalls.get(callId);
      if (!record) return;

      if (!isParticipant(record, socket.userId)) {
        emitError(socket, 'Call not found');
        return;
      }

      const targetId = otherPartyId(record, socket.userId);
      clearTimeout(record.timeoutHandle);

      if (record.status === 'active') {
        const durationSec = Math.round((Date.now() - record.answeredAt) / 1000);
        await createCallRecord({
          callerId: record.callerId,
          calleeId: record.calleeId,
          callType: record.callType,
          status: 'completed',
          startedAt: new Date(record.answeredAt),
          endedAt: new Date(),
          durationSec,
        });
      } else {
        await persistUnanswered(record, 'missed');
      }

      getIO().to(`user:${targetId}`).emit('call:end', { callId });
      cleanup(callId);
    } catch (err) {
      logger.error(`call:end failed for user:${socket.userId}: ${err.message}`);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const callId = userActiveCall.get(socket.userId);
      if (!callId) return;

      const record = activeCalls.get(callId);
      if (!record) return;

      const targetId = otherPartyId(record, socket.userId);
      clearTimeout(record.timeoutHandle);

      if (record.status === 'active') {
        const durationSec = Math.round((Date.now() - record.answeredAt) / 1000);
        await createCallRecord({
          callerId: record.callerId,
          calleeId: record.calleeId,
          callType: record.callType,
          status: 'failed',
          startedAt: new Date(record.answeredAt),
          endedAt: new Date(),
          durationSec,
        });
      } else {
        await persistUnanswered(record, 'missed');
      }

      getIO().to(`user:${targetId}`).emit('call:end', { callId });
      cleanup(callId);
    } catch (err) {
      logger.error(`call disconnect cleanup failed for user:${socket.userId}: ${err.message}`);
    }
  });
};
