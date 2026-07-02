import { DataTypes } from 'sequelize';

const defineStoryView = (sequelize) =>
  sequelize.define(
    'StoryView',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      storyId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      viewerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      viewedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'story_views',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['story_id', 'viewer_id'] }],
    }
  );

export default defineStoryView;
