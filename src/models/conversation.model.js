import { DataTypes } from 'sequelize';

const defineConversation = (sequelize) =>
  sequelize.define(
    'Conversation',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      isGroup: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'conversations',
      underscored: true,
      timestamps: true,
    }
  );

export default defineConversation;
