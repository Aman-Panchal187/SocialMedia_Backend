import { DataTypes } from 'sequelize';

const defineLike = (sequelize) =>
  sequelize.define(
    'Like',
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
      postId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: 'likes',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id', 'post_id'] }],
    }
  );

export default defineLike;
