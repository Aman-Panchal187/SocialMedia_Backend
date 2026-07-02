import { DataTypes } from 'sequelize';

const defineConversationParticipant = (sequelize) =>
  sequelize.define(
    'ConversationParticipant',
    {
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      lastReadMessageId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'conversation_participants',
      underscored: true,
      timestamps: true,
    }
  );

export default defineConversationParticipant;
