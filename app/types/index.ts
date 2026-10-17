export type WishlistCategory = 'christmas' | 'birthday' | 'birth' | 'wedding' | 'housewarming' | 'other'

export interface WishlistItem {
  id: string
  listId: string
  title: string
  description?: string
  url?: string
  imageUrl?: string
  price?: number
  currency?: string
  
  // Recipient / Beneficiary inside a shared family list
  recipientName?: string // Ex: "Papa", "Sophie", "Lucas (10 ans)"
  recipientId?: string
  recipientAvatar?: string

  // Actor who added the item
  addedById?: string
  addedByName?: string

  // Custom details: quantity, color, note/comment box
  quantity?: number
  colorOrVariant?: string
  comment?: string // "petit cadre commentaire dans sa propre liste"
  isFavorite?: boolean // Coup de coeur
  priority?: 'low' | 'medium' | 'high'

  // Anonymous purchase / reservation tracking
  isPurchased: boolean
  purchasedBy?: {
    isAnonymous: boolean
    name?: string
    userId?: string
  }
  purchasedAt?: string
  createdAt: string
  updatedAt: string
}

export interface WishlistMember {
  id: string
  name: string
  avatar?: string
  joinedAt?: string
  role?: 'owner' | 'member' | 'child'
  isChild?: boolean
  parentId?: string
  parentName?: string
  age?: number
  pushEnabled?: boolean
}

export interface PushSubscriptionKeys {
  p256dh?: string
  auth?: string
}

export interface PushSubscriptionRecord {
  id: string
  listId: string
  userId: string
  userName: string
  userAvatar?: string
  endpoint?: string
  keys?: PushSubscriptionKeys
  enabled: boolean
  notifyOnAdd: boolean
  notifyOnReserve: boolean
  createdAt: string
  updatedAt: string
}

export type ListNotificationType = 'item_added' | 'item_reserved'

export interface ListNotificationEvent {
  id: string
  listId: string
  listTitle: string
  type: ListNotificationType
  title: string
  body: string
  itemId: string
  itemTitle: string
  recipientName?: string
  recipientId?: string
  isChildRecipient?: boolean
  actorId?: string
  actorName?: string
  isAnonymous?: boolean
  createdAt: string
}

export interface Wishlist {
  id: string
  ownerId: string
  ownerName: string
  ownerAvatar?: string
  title: string
  description?: string
  category: WishlistCategory
  eventDate?: string
  coverEmoji?: string
  coverGradient?: string
  inviteCode: string
  members: (string | WishlistMember)[] // Member objects or User IDs
  items: WishlistItem[]
  isArchived?: boolean
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar: string
  isGuest?: boolean
  joinedListIds: string[]
}

export interface LinkMetadata {
  title?: string
  description?: string
  imageUrl?: string
  price?: number
  currency?: string
  siteName?: string
  url: string
}
