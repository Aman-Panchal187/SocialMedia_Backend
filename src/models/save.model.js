import { DataTypes } from 'sequelize';

const defineSave = (sequelize) =>
  sequelize.define(
    'Save',
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
      tableName: 'saves',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id', 'post_id'] }],
    }
  );

export default defineSave;
