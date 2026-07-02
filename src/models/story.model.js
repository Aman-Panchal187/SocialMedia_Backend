import { DataTypes } from 'sequelize';

const defineStory = (sequelize) =>
  sequelize.define(
    'Story',
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
      caption: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'stories',
      underscored: true,
      timestamps: true,
    }
  );

export default defineStory;
