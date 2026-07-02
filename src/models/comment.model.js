import { DataTypes } from 'sequelize';

const defineComment = (sequelize) =>
  sequelize.define(
    'Comment',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      postId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      parentCommentId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      content: {
        type: DataTypes.STRING(2200),
        allowNull: false,
      },
      likeCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'comments',
      underscored: true,
      timestamps: true,
      paranoid: true,
    }
  );

export default defineComment;
