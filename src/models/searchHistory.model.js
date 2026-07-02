import { DataTypes } from 'sequelize';

const defineSearchHistory = (sequelize) =>
  sequelize.define(
    'SearchHistory',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      searchedUserId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: 'search_history',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id', 'searched_user_id'] }],
    }
  );

export default defineSearchHistory;
