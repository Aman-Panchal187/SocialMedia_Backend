import { DataTypes } from 'sequelize';

const defineMessage = (sequelize) =>
  sequelize.define(
    'Message',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      contentType: {
        type: DataTypes.ENUM('text', 'image', 'video', 'file'),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      mediaUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      publicId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('sent', 'delivered', 'read'),
        allowNull: false,
        defaultValue: 'sent',
      },
      replyToStoryId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'messages',
      underscored: true,
      timestamps: true,
      paranoid: true,
    }
  );

export default defineMessage;
