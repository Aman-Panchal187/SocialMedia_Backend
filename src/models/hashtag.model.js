import { DataTypes } from 'sequelize';

const defineHashtag = (sequelize) =>
  sequelize.define(
    'Hashtag',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tag: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: 'hashtags',
      underscored: true,
      timestamps: true,
    }
  );

export default defineHashtag;
