import { DataTypes } from 'sequelize';

const defineFollow = (sequelize) =>
  sequelize.define(
    'Follow',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      followerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      followingId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'accepted'),
        allowNull: false,
        defaultValue: 'accepted',
      },
    },
    {
      tableName: 'follows',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['follower_id', 'following_id'] }],
    }
  );

export default defineFollow;
