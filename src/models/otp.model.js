import { DataTypes } from 'sequelize';

const defineOtp = (sequelize) =>
  sequelize.define(
    'Otp',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      codeHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      purpose: {
        type: DataTypes.ENUM('email_verify', 'password_reset'),
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      consumedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      attemptCount: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'otps',
      underscored: true,
      timestamps: true,
    }
  );

export default defineOtp;
