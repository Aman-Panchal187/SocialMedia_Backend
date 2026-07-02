import { DataTypes } from 'sequelize';

const defineRefreshToken = (sequelize) =>
  sequelize.define(
    'RefreshToken',
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
      tokenHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      deviceInfo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isRevoked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'refresh_tokens',
      underscored: true,
      timestamps: true,
    }
  );

export default defineRefreshToken;
