import { SharedValue } from "react-native-reanimated";

export interface EmojiPlacement {
  id: string;
  emoji: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  userName: string;
  deviceId: string;
  timestamp: number;
}

export interface RoomState {
  roomId: string;
  currentImage: string | null;
  currentImageBlurHash?: string | null;
  emojis: EmojiPlacement[];
  userCount: number;
  owner: string | null;
  ownerDeviceId: string | null;
  invitedPhoneNumbers?: string[];
  pendingInvitations?: InvitedUser[];
  createdAt: number;
  imageTransform?: {
    scale: number;
    translateX: number;
    translateY: number;
  };
  participants: Participant[]; // All users who ever joined - online users have isOnline: true
  proposals?: ImageProposal[];
}

export interface InvitedUser {
  phoneNumber: string;
  userName?: string;
  profileImage?: string;
  userId?: string;
  invitedAt: number;
  invitedBy: string; // deviceId of inviter
  invitedByName?: string; // name of inviter
  status: "pending" | "joined" | "declined";
}

export interface RoomStateWithOwnership extends RoomState {
  isOwner: boolean;
  submissions: ClientSubmission[];
}

export interface Participant {
  deviceId: string;
  userName: string;
  socketId: string;
  joinedAt: number;
  firstJoinedAt: number;
  lastSeenAt: number;
  isOwner: boolean;
  isOnline: boolean;
  _id: string;
  profileImage?: string;
  phoneNumber?: string;
  userId?: string;
  totalJoins: number;
}

// Legacy - use Participant instead
export interface PersistentParticipant {
  deviceId: string;
  userName: string;
  profileImage?: string;
  phoneNumber?: string;
  userId?: string;
  firstJoinedAt: number;
  lastSeenAt: number;
  totalJoins: number;
  isCurrentlyOnline: boolean;
}

export interface ClientSubmission {
  id: string;
  imageUrl: string;
  blurHash?: string;
  submittedByDeviceId: string;
  submittedByUserName: string;
  createdAt: number;
}

export interface ImageProposal {
  id: string;
  dataUrl: string;
  blurHash?: string;
  fileName: string;
  mimeType: string;
  proposerDeviceId: string;
  proposerUserName: string;
  timestamp: number;
}

// Legacy - use Participant instead
export interface ParticipantHistory {
  deviceId: string;
  userName: string;
  firstJoinedAt: number;
  lastSeenAt: number;
  joinsCount: number;
}

export type ImageTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

export type ParticipantsUpdatedEmit = Participant[];

export interface JoinRoomData {
  roomId: string;
  deviceId: string;
  userId: string;
  userName: string;
  phoneNumber: string;
  profileImage?: string;
  invitedPhoneNumbers?: string[];
  isCreating: boolean;
  joinedAt: number;
  fcmToken?: string;
}

export interface RoomCreatedData {
  originalRoomName: string;
  actualRoomId: string;
  createdAt: number;
}

export interface UserJoinedRoomData {
  roomId: string;
  participant: Participant;
  phoneNumber?: string; // If they were invited by phone
  wasInvited: boolean;
}

export interface InvitationStatusChangedData {
  roomId: string;
  phoneNumber: string;
  status: "joined" | "declined";
  updatedInvitations: InvitedUser[];
}

export interface UploadProgress {
  received: number;
  total: number;
  percentage: number;
}

export interface UploadProgressOverlayProps {
  isVisible: boolean;
  progress: UploadProgress | null;
  status: string;
  isOwner: boolean;
  onCancel?: () => void;
}

export interface InteractiveEmojiProps {
  id: string;
  emoji: string;
  x: number;
  y: number;
  userName: string;
  selectedEmojiId: string | null;
  isNew: boolean;
  initialOffsetX: number;
  initialOffsetY: number;
  initialScale: number;
  initialRotation: number;
  isSelected: boolean;
  onUpdate: (update: {
    id: string;
    offsetX: number;
    offsetY: number;
    scale: number;
    rotation: number;
  }) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isOwnEmoji: boolean;
  disableInternalGestures?: boolean;
  externalScaleSV?: SharedValue<number | null>;
  externalRotationSV?: SharedValue<number | null>;
  containerLayout?: { width: number; height: number };
  baseY?: number;
  boundaryPadding?: {
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
  hideSelectionUI?: boolean;
}

export interface emojiSelectionProps {
  selectedEmoji: string | null;
  setSelectedEmoji: React.Dispatch<React.SetStateAction<string | null>>;
  onButtonPress: () => void;
  iconName: any;
  onUserSelect?: (user: any) => void;
  onImageSelect?: (image: string) => void;
  onInvite?: () => void;
  participants?: Participant[];
  recentImages?: string[];
  roomCode?: string;
  roomId?: string;
  onInviteContacts?: (selectedContacts: any[]) => void;
  onAddButtonPress?: () => void;
  hideUserView?: boolean;
  isLoading?: boolean;
  reviewingSubmission: {
    imageUrl: string;
    submissionId: string;
  } | null;
  handleSubmissionApprove: () => void;
  handleSubmissionReject: () => void;
}

export interface GalleryItem extends Story {
  id: string;
  uri: string;
  width: number;
  height: number;
  creationTime: number;
  mediaType: "photo" | "video" | "audio" | "unknown";
}

export interface Story {
  _id: string;
  title?: string;
  like_count?: number;
  username?: string;
  profile_image?: string;

  image?: string;
}

export interface StoryRowProps {
  stories: Story[];
  contestStoryData: Story[];
}
