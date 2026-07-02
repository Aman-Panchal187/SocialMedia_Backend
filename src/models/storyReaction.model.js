import { DataTypes } from 'sequelize';

const defineStoryReaction = (sequelize) =>
  sequelize.define(
    'StoryReaction',
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
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reactionEmoji: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: 'story_reactions',
      underscored: true,
      timestamps: true,
    }
  );

export default defineStoryReaction;
