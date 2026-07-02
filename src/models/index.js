import sequelize from '../config/database.js';
import defineUser from './user.model.js';
import defineRefreshToken from './refreshToken.model.js';
import defineOtp from './otp.model.js';
import definePost from './post.model.js';
import definePostMedia from './postMedia.model.js';
import defineHashtag from './hashtag.model.js';
import definePostHashtag from './postHashtag.model.js';
import defineLike from './like.model.js';
import defineComment from './comment.model.js';
import defineCommentLike from './commentLike.model.js';
import defineSave from './save.model.js';
import defineFollow from './follow.model.js';
import defineNotification from './notification.model.js';
import defineConversation from './conversation.model.js';
import defineConversationParticipant from './conversationParticipant.model.js';
import defineMessage from './message.model.js';
import defineStory from './story.model.js';
import defineStoryView from './storyView.model.js';
import defineStoryReaction from './storyReaction.model.js';
import defineCall from './call.model.js';
import defineSearchHistory from './searchHistory.model.js';

const User = defineUser(sequelize);
const RefreshToken = defineRefreshToken(sequelize);
const Otp = defineOtp(sequelize);
const Post = definePost(sequelize);
const PostMedia = definePostMedia(sequelize);
const Hashtag = defineHashtag(sequelize);
const PostHashtag = definePostHashtag(sequelize);
const Like = defineLike(sequelize);
const Comment = defineComment(sequelize);
const CommentLike = defineCommentLike(sequelize);
const Save = defineSave(sequelize);
const Follow = defineFollow(sequelize);
const Notification = defineNotification(sequelize);
const Conversation = defineConversation(sequelize);
const ConversationParticipant = defineConversationParticipant(sequelize);
const Message = defineMessage(sequelize);
const Story = defineStory(sequelize);
const StoryView = defineStoryView(sequelize);
const StoryReaction = defineStoryReaction(sequelize);
const Call = defineCall(sequelize);
const SearchHistory = defineSearchHistory(sequelize);

// --- users ---
User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Otp, { foreignKey: 'userId', onDelete: 'SET NULL' });
Otp.belongsTo(User, { foreignKey: 'userId' });

// --- posts ---
User.hasMany(Post, { foreignKey: 'userId', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });

Post.hasMany(PostMedia, { foreignKey: 'postId', onDelete: 'CASCADE', as: 'media' });
PostMedia.belongsTo(Post, { foreignKey: 'postId' });

Post.belongsToMany(Hashtag, { through: PostHashtag, foreignKey: 'postId', otherKey: 'hashtagId', as: 'hashtags' });
Hashtag.belongsToMany(Post, { through: PostHashtag, foreignKey: 'hashtagId', otherKey: 'postId', as: 'posts' });
Post.hasMany(PostHashtag, { foreignKey: 'postId', onDelete: 'CASCADE' });
PostHashtag.belongsTo(Post, { foreignKey: 'postId' });
Hashtag.hasMany(PostHashtag, { foreignKey: 'hashtagId', onDelete: 'CASCADE' });
PostHashtag.belongsTo(Hashtag, { foreignKey: 'hashtagId' });

// --- likes ---
User.hasMany(Like, { foreignKey: 'userId', onDelete: 'CASCADE' });
Like.belongsTo(User, { foreignKey: 'userId' });
Post.hasMany(Like, { foreignKey: 'postId', onDelete: 'CASCADE' });
Like.belongsTo(Post, { foreignKey: 'postId' });

// --- comments ---
Post.hasMany(Comment, { foreignKey: 'postId', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'postId' });
User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Comment.hasMany(Comment, { foreignKey: 'parentCommentId', as: 'replies', onDelete: 'SET NULL' });
Comment.belongsTo(Comment, { foreignKey: 'parentCommentId', as: 'parentComment' });

User.hasMany(CommentLike, { foreignKey: 'userId', onDelete: 'CASCADE' });
CommentLike.belongsTo(User, { foreignKey: 'userId' });
Comment.hasMany(CommentLike, { foreignKey: 'commentId', onDelete: 'CASCADE' });
CommentLike.belongsTo(Comment, { foreignKey: 'commentId' });

// --- saves ---
User.hasMany(Save, { foreignKey: 'userId', onDelete: 'CASCADE' });
Save.belongsTo(User, { foreignKey: 'userId' });
Post.hasMany(Save, { foreignKey: 'postId', onDelete: 'CASCADE' });
Save.belongsTo(Post, { foreignKey: 'postId' });

// --- follows (self-referential on users) ---
User.hasMany(Follow, { foreignKey: 'followerId', as: 'followingRows', onDelete: 'CASCADE' });
User.hasMany(Follow, { foreignKey: 'followingId', as: 'followerRows', onDelete: 'CASCADE' });
Follow.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });
Follow.belongsTo(User, { foreignKey: 'followingId', as: 'following' });

// --- notifications (Phase 2+, associations only) ---
User.hasMany(Notification, { foreignKey: 'recipientId', as: 'receivedNotifications', onDelete: 'CASCADE' });
User.hasMany(Notification, { foreignKey: 'actorId', as: 'actedNotifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
Notification.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

// --- chat (Phase 4+, associations only) ---
Conversation.hasMany(ConversationParticipant, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
ConversationParticipant.belongsTo(Conversation, { foreignKey: 'conversationId' });
User.hasMany(ConversationParticipant, { foreignKey: 'userId', onDelete: 'CASCADE' });
ConversationParticipant.belongsTo(User, { foreignKey: 'userId' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });
User.hasMany(Message, { foreignKey: 'senderId', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// --- stories (Phase 3+, associations only) ---
User.hasMany(Story, { foreignKey: 'userId', onDelete: 'CASCADE' });
Story.belongsTo(User, { foreignKey: 'userId', as: 'author' });

Story.hasMany(StoryView, { foreignKey: 'storyId', onDelete: 'CASCADE' });
StoryView.belongsTo(Story, { foreignKey: 'storyId' });
User.hasMany(StoryView, { foreignKey: 'viewerId', onDelete: 'CASCADE' });
StoryView.belongsTo(User, { foreignKey: 'viewerId', as: 'viewer' });

Story.hasMany(StoryReaction, { foreignKey: 'storyId', onDelete: 'CASCADE' });
StoryReaction.belongsTo(Story, { foreignKey: 'storyId' });
User.hasMany(StoryReaction, { foreignKey: 'userId', onDelete: 'CASCADE' });
StoryReaction.belongsTo(User, { foreignKey: 'userId' });

// --- calls (Phase 6+, associations only) ---
User.hasMany(Call, { foreignKey: 'callerId', as: 'outgoingCalls', onDelete: 'CASCADE' });
User.hasMany(Call, { foreignKey: 'calleeId', as: 'incomingCalls', onDelete: 'CASCADE' });
Call.belongsTo(User, { foreignKey: 'callerId', as: 'caller' });
Call.belongsTo(User, { foreignKey: 'calleeId', as: 'callee' });

// --- search history (Phase 8+, associations only) ---
User.hasMany(SearchHistory, { foreignKey: 'userId', as: 'searchHistory', onDelete: 'CASCADE' });
User.hasMany(SearchHistory, { foreignKey: 'searchedUserId', as: 'searchedByOthers', onDelete: 'CASCADE' });
SearchHistory.belongsTo(User, { foreignKey: 'userId' });
SearchHistory.belongsTo(User, { foreignKey: 'searchedUserId', as: 'searchedUser' });

const db = {
  sequelize,
  User,
  RefreshToken,
  Otp,
  Post,
  PostMedia,
  Hashtag,
  PostHashtag,
  Like,
  Comment,
  CommentLike,
  Save,
  Follow,
  Notification,
  Conversation,
  ConversationParticipant,
  Message,
  Story,
  StoryView,
  StoryReaction,
  Call,
  SearchHistory,
};

export default db;
