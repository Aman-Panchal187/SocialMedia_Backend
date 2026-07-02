import { DataTypes } from 'sequelize';

const defineCommentLike = (sequelize) =>
  sequelize.define(
    'CommentLike',
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
      commentId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: 'comment_likes',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id', 'comment_id'] }],
    }
  );

export default defineCommentLike;
