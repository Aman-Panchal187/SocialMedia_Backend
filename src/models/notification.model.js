import { DataTypes } from 'sequelize';

const defineNotification = (sequelize) =>
  sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      recipientId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      actorId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          'like',
          'comment',
          'reply',
          'follow',
          'follow_request',
          'story_reaction',
          'story_reply',
          'message'
        ),
        allowNull: false,
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      entityId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'notifications',
      underscored: true,
      timestamps: true,
    }
  );

export default defineNotification;
