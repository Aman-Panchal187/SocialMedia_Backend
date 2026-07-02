import { DataTypes } from 'sequelize';

const definePostHashtag = (sequelize) =>
  sequelize.define(
    'PostHashtag',
    {
      postId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      hashtagId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
    },
    {
      tableName: 'post_hashtags',
      underscored: true,
      timestamps: true,
    }
  );

export default definePostHashtag;
