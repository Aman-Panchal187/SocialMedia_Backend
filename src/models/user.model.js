import { DataTypes } from 'sequelize';

const defineUser = (sequelize) =>
  sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fullName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      bio: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      avatarPublicId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isPrivate: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isVerifiedEmail: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'users',
      underscored: true,
      timestamps: true,
      paranoid: true,
    }
  );

export default defineUser;
