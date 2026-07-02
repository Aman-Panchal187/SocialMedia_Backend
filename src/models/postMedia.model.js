import { DataTypes } from 'sequelize';

const definePostMedia = (sequelize) =>
  sequelize.define(
    'PostMedia',
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
      mediaUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      publicId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mediaType: {
        type: DataTypes.ENUM('image', 'video'),
        allowNull: false,
      },
      position: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0,
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      durationSec: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'post_media',
      underscored: true,
      timestamps: true,
    }
  );

export default definePostMedia;
