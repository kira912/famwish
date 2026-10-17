import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveList,
  getListById,
  getLists,
  addMemberToList,
  removeMemberFromList,
  saveItem,
  deleteItem,
  togglePurchaseItem,
  deleteList,
  getListNotificationsForMember,
  shouldMemberReceiveNotification
} from '../../server/utils/db'
import {
  mapRowToWishlist,
  mapRowToWishlistItem,
  mapWishlistToRow,
  mapWishlistItemToRow,
  mapPushSubscriptionToRow,
  mapRowToPushSubscription,
  mapListNotificationToRow,
  mapRowToListNotification
} from '../../server/database/mappers'
import {
  wishlistsTable,
  wishlistItemsTable,
  pushSubscriptionsTable,
  listNotificationsTable
} from '../../server/database/schema'
import { InMemoryWishlistRepository } from '../../server/repositories/wishlist.repository'
import { WishlistService } from '../../server/services/wishlist.service'
import type { Wishlist, WishlistItem } from '../../types'

describe('Parcours critique Backend & Gestion des listes (FamWish)', () => {
  const testListId = 'list-unit-critical-1'
  const testInviteCode = 'NOEL26'

  beforeEach(async () => {
    delete process.env.POSTGRES_URL
    delete process.env.DATABASE_URL
    await deleteList(testListId)
  })

  it('crée une liste et enregistre automatiquement le créateur comme membre complet', async () => {
    const newList: Wishlist = {
      id: testListId,
      ownerId: 'user-owner-1',
      ownerName: 'Sophie',
      title: 'Hotte de Noël Famille',
      description: 'Nos idées cadeaux pour Noël',
      category: 'christmas',
      inviteCode: testInviteCode,
      members: ['user-owner-1'],
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const saved = await saveList(newList)
    expect(saved.id).toBe(testListId)
    expect(saved.ownerName).toBe('Sophie')
    expect(Array.isArray(saved.members)).toBe(true)
    expect(saved.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'user-owner-1',
          name: 'Sophie',
          role: 'owner',
          pushEnabled: true
        })
      ])
    )

    // Recherche par ID et par code d'invitation (insensible à la casse)
    const byId = await getListById(testListId)
    expect(byId?.title).toBe('Hotte de Noël Famille')

    const byCode = await getListById('noel26')
    expect(byCode?.id).toBe(testListId)
  })

  it('ajoute un membre qui rejoint la liste et conserve son nom même après modification de la liste', async () => {
    await saveList({
      id: testListId,
      ownerId: 'user-owner-1',
      ownerName: 'Sophie',
      title: 'Noël 2026',
      category: 'christmas',
      inviteCode: testInviteCode,
      members: [],
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Tonton Marc rejoint la liste via le code d'invitation
    const updatedAfterJoin = await addMemberToList(testInviteCode, {
      id: 'user-guest-marc',
      name: 'Tonton Marc'
    })

    expect(updatedAfterJoin).not.toBeNull()
    const memberNames = (updatedAfterJoin!.members as any[]).map(m =>
      typeof m === 'object' ? m.name : m
    )
    expect(memberNames).toContain('Sophie')
    expect(memberNames).toContain('Tonton Marc')

    // Si le propriétaire modifie le titre de sa liste avec un tableau members incomplet, Tonton Marc est conservé
    const updatedAfterEdit = await saveList({
      ...updatedAfterJoin!,
      title: 'Noël 2026 - Édition Famille',
      members: ['user-owner-1']
    })

    const preservedNames = (updatedAfterEdit.members as any[]).map(m =>
      typeof m === 'object' ? m.name : m
    )
    expect(preservedNames).toContain('Sophie')
    expect(preservedNames).toContain('Tonton Marc')

    // Tonton Marc retrouve la liste dans ses listes rejointes
    const marcLists = await getLists('user-guest-marc', [])
    expect(marcLists.map(l => l.id)).toContain(testListId)
  })

  it('permet de supprimer une personne de la liste ainsi que ses cadeaux associés tout en protégeant le créateur', async () => {
    await saveList({
      id: testListId,
      ownerId: 'user-owner-1',
      ownerName: 'Sophie',
      title: 'Noël Famille',
      category: 'christmas',
      inviteCode: testInviteCode,
      members: [],
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    await addMemberToList(testListId, {
      id: 'user-guest-paul',
      name: 'Paul'
    })

    await saveItem(testListId, {
      id: 'item-paul-1',
      listId: testListId,
      title: 'Casque Audio',
      recipientName: 'Paul',
      recipientId: 'user-guest-paul',
      currency: '€',
      quantity: 1,
      isFavorite: false,
      priority: 'medium',
      isPurchased: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    await saveItem(testListId, {
      id: 'item-sophie-1',
      listId: testListId,
      title: 'Écharpe en laine',
      recipientName: 'Sophie',
      recipientId: 'user-owner-1',
      currency: '€',
      quantity: 1,
      isFavorite: true,
      priority: 'high',
      isPurchased: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Suppression de Paul par son ID
    const afterRemovePaul = await removeMemberFromList(testListId, 'user-guest-paul')
    expect(afterRemovePaul).not.toBeNull()
    const memberNames = (afterRemovePaul!.members as any[]).map(m =>
      typeof m === 'object' ? m.name : m
    )
    expect(memberNames).not.toContain('Paul')
    expect(memberNames).toContain('Sophie')
    expect(afterRemovePaul!.items.map(i => i.id)).toEqual(['item-sophie-1'])

    // Le créateur ne peut pas être supprimé
    const afterAttemptRemoveOwner = await removeMemberFromList(testListId, 'Sophie')
    const finalMemberNames = (afterAttemptRemoveOwner!.members as any[]).map(m =>
      typeof m === 'object' ? m.name : m
    )
    expect(finalMemberNames).toContain('Sophie')
    expect(afterAttemptRemoveOwner!.items.map(i => i.id)).toEqual(['item-sophie-1'])
  })

  it('gère l’ajout, la mise à jour, la conservation après édition de liste et le retrait d’un enfant sans compte rattaché à un parent', async () => {
    await saveList({
      id: testListId,
      ownerId: 'user-owner-1',
      ownerName: 'Sophie',
      title: 'Noël Famille',
      category: 'christmas',
      inviteCode: testInviteCode,
      members: [],
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // 1. Ajout de l'enfant Lucas rattaché à Sophie
    const withChild = await addMemberToList(testListId, {
      id: 'child-lucas-1',
      name: 'Lucas',
      role: 'child',
      isChild: true,
      parentId: 'user-owner-1',
      parentName: 'Sophie',
      age: 7
    })

    expect(withChild).not.toBeNull()
    expect(withChild!.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'child-lucas-1',
          name: 'Lucas',
          role: 'child',
          isChild: true,
          parentId: 'user-owner-1',
          parentName: 'Sophie',
          age: 7
        })
      ])
    )

    // 2. Mise à jour de l'âge de Lucas sans créer de doublon
    const afterUpdateChild = await addMemberToList(testListId, {
      id: 'child-lucas-1',
      name: 'Lucas',
      role: 'child',
      isChild: true,
      parentId: 'user-owner-1',
      parentName: 'Sophie',
      age: 8
    })

    const lucasEntries = (afterUpdateChild!.members as any[]).filter(
      m => typeof m === 'object' && m.name === 'Lucas'
    )
    expect(lucasEntries).toHaveLength(1)
    expect(lucasEntries[0].age).toBe(8)
    expect(lucasEntries[0].parentName).toBe('Sophie')

    // 3. Conservation de l'enfant lors d'une modification des métadonnées de la liste
    const afterListEdit = await saveList({
      ...afterUpdateChild!,
      title: 'Noël Famille 2026',
      members: ['user-owner-1']
    })
    expect(afterListEdit.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'child-lucas-1',
          name: 'Lucas',
          role: 'child',
          isChild: true,
          parentName: 'Sophie',
          age: 8
        })
      ])
    )

    // 4. Retrait de l'enfant par ID
    const afterRemove = await removeMemberFromList(testListId, 'child-lucas-1')
    expect(afterRemove).not.toBeNull()
    const remainingNames = (afterRemove!.members as any[]).map(m =>
      typeof m === 'object' ? m.name : m
    )
    expect(remainingNames).not.toContain('Lucas')
    expect(remainingNames).toContain('Sophie')
  })

  it('gère l’ajout, la modification, la réservation secrète et la suppression de cadeaux', async () => {
    await saveList({
      id: testListId,
      ownerId: 'user-owner-1',
      ownerName: 'Sophie',
      title: 'Liste Anniversaire',
      category: 'birthday',
      inviteCode: testInviteCode,
      members: [],
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    const item: WishlistItem = {
      id: 'item-1',
      listId: testListId,
      title: 'Machine à café expresso',
      recipientName: 'Sophie',
      price: 129.99,
      currency: '€',
      quantity: 1,
      isFavorite: true,
      priority: 'high',
      isPurchased: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const savedItem = await saveItem(testListId, item)
    expect(savedItem?.title).toBe('Machine à café expresso')

    // Réservation nominative par Manon
    const reservedItem = await togglePurchaseItem(
      testListId,
      'item-1',
      true,
      'Manon',
      false,
      'user-manon'
    )
    expect(reservedItem?.isPurchased).toBe(true)
    expect(reservedItem?.purchasedBy?.isAnonymous).toBe(false)
    expect(reservedItem?.purchasedBy?.name).toBe('Manon')

    // Annulation de la réservation
    const unreservedItem = await togglePurchaseItem(testListId, 'item-1', false)
    expect(unreservedItem?.isPurchased).toBe(false)
    expect(unreservedItem?.purchasedBy).toBeUndefined()

    // Suppression du cadeau
    const deleted = await deleteItem(testListId, 'item-1')
    expect(deleted).toBe(true)

    const listAfterDelete = await getListById(testListId)
    expect(listAfterDelete?.items).toHaveLength(0)
  })

  it('active les notifications push par défaut pour les membres et notifie lors d’un ajout ou d’une réservation en respectant l’anti-spoiler', async () => {
    await saveList({
      id: testListId,
      ownerId: 'user-sophie',
      ownerName: 'Sophie',
      title: 'Noël en Famille',
      category: 'christmas',
      inviteCode: testInviteCode,
      members: [],
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Ajouter Tonton Marc, Manon et l'enfant Lucas (rattaché à Sophie) — les notifications push sont actives de base sans configuration
    await addMemberToList(testListId, { id: 'user-marc', name: 'Tonton Marc' })
    await addMemberToList(testListId, { id: 'user-manon', name: 'Manon' })
    await addMemberToList(testListId, {
      id: 'child-lucas',
      name: 'Lucas',
      role: 'child',
      isChild: true,
      parentId: 'user-sophie',
      parentName: 'Sophie',
      age: 7
    })

    // 1. Sophie ajoute un cadeau pour elle-même ("Pull en cachemire")
    await saveItem(
      testListId,
      {
        id: 'item-sophie-pull',
        listId: testListId,
        title: 'Pull en cachemire',
        recipientName: 'Sophie',
        recipientId: 'user-sophie',
        isPurchased: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      { id: 'user-sophie', name: 'Sophie' }
    )

    // Tonton Marc reçoit la notification d'ajout (abonné de base sans config), mais Sophie (qui a fait l'action) ne reçoit pas sa propre notification
    const marcFeedAfterAdd = await getListNotificationsForMember(testListId, {
      userId: 'user-marc',
      userName: 'Tonton Marc'
    })
    expect(marcFeedAfterAdd.mySubscription?.enabled).toBe(true)
    expect(marcFeedAfterAdd.notifications).toHaveLength(1)
    expect(marcFeedAfterAdd.notifications[0].type).toBe('item_added')
    expect(marcFeedAfterAdd.notifications[0].body).toContain('Pull en cachemire')

    const sophieFeedAfterOwnAdd = await getListNotificationsForMember(testListId, {
      userId: 'user-sophie',
      userName: 'Sophie'
    })
    expect(sophieFeedAfterOwnAdd.mySubscription?.enabled).toBe(true)
    expect(sophieFeedAfterOwnAdd.notifications).toHaveLength(0)

    // 2. Tonton Marc réserve le cadeau de Sophie en secret
    await togglePurchaseItem(
      testListId,
      'item-sophie-pull',
      true,
      'Tonton Marc',
      true,
      'user-marc'
    )

    // Manon (autre membre) reçoit la notification de réservation secrète
    const manonFeedAfterReserve = await getListNotificationsForMember(testListId, {
      userId: 'user-manon',
      userName: 'Manon'
    })
    expect(manonFeedAfterReserve.mySubscription?.enabled).toBe(true)
    expect(manonFeedAfterReserve.notifications.some(n => n.type === 'item_reserved')).toBe(true)
    const reserveNotifForManon = manonFeedAfterReserve.notifications.find(n => n.type === 'item_reserved')!
    expect(reserveNotifForManon.body).toContain('Un lutin secret')
    expect(reserveNotifForManon.body).toContain('Pull en cachemire')

    // ANTI-SPOILER CRITIQUE : Sophie (bénéficiaire adulte) ne doit JAMAIS recevoir la notification que son cadeau est réservé !
    const sophieFeedAfterReserve = await getListNotificationsForMember(testListId, {
      userId: 'user-sophie',
      userName: 'Sophie'
    })
    expect(sophieFeedAfterReserve.notifications.some(n => n.type === 'item_reserved')).toBe(false)

    // 3. Sophie ajoute un cadeau pour son enfant Lucas ("Train en bois"), puis Tonton Marc le réserve
    await saveItem(
      testListId,
      {
        id: 'item-lucas-train',
        listId: testListId,
        title: 'Train en bois',
        recipientName: 'Lucas',
        recipientId: 'child-lucas',
        isPurchased: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      { id: 'user-sophie', name: 'Sophie' }
    )

    await togglePurchaseItem(
      testListId,
      'item-lucas-train',
      true,
      'Tonton Marc',
      false,
      'user-marc'
    )

    // Comme Lucas est un enfant sans compte, Sophie (son parent) reçoit bien la notification que le cadeau de Lucas a été réservé par Tonton Marc !
    const sophieFeedAfterChildReserve = await getListNotificationsForMember(testListId, {
      userId: 'user-sophie',
      userName: 'Sophie'
    })
    expect(sophieFeedAfterChildReserve.notifications).toHaveLength(1)
    expect(sophieFeedAfterChildReserve.notifications[0].type).toBe('item_reserved')
    expect(sophieFeedAfterChildReserve.notifications[0].body).toContain('Tonton Marc a réservé « Train en bois » pour Lucas')
  })

  it('valide les mappers bidirectionnels Drizzle ORM <-> Entités Domaine et l’injection de Repository', async () => {
    expect(wishlistsTable).toBeDefined()
    expect(wishlistItemsTable).toBeDefined()
    expect(pushSubscriptionsTable).toBeDefined()
    expect(listNotificationsTable).toBeDefined()

    const now = new Date('2026-12-01T12:00:00.000Z')
    const domainList: Wishlist = {
      id: 'list-orm-1',
      ownerId: 'owner-1',
      ownerName: 'Camille',
      title: 'Noël ORM',
      category: 'christmas',
      inviteCode: 'ORM123',
      members: [{ id: 'owner-1', name: 'Camille', role: 'owner' }],
      items: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }

    const dbRow = mapWishlistToRow(domainList, now)
    expect(dbRow.ownerId).toBe('owner-1')
    expect(dbRow.inviteCode).toBe('ORM123')

    const domainItem: WishlistItem = {
      id: 'item-orm-1',
      listId: 'list-orm-1',
      title: 'Livre Architecture Logicielle',
      price: 45.5,
      currency: '€',
      quantity: 2,
      priority: 'high',
      isFavorite: true,
      isPurchased: true,
      purchasedBy: { isAnonymous: true, name: 'Père Noël Secret' },
      purchasedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }

    const itemRow = mapWishlistItemToRow('list-orm-1', domainItem, now)
    expect(itemRow.price).toBe('45.5')
    expect(itemRow.quantity).toBe(2)

    const roundTripItem = mapRowToWishlistItem(itemRow as any)
    expect(roundTripItem.price).toBe(45.5)
    expect(roundTripItem.purchasedBy?.name).toBe('Père Noël Secret')

    const roundTripList = mapRowToWishlist(dbRow as any, [roundTripItem])
    expect(roundTripList.id).toBe('list-orm-1')
    expect(roundTripList.items).toHaveLength(1)

    // Test mappers PushSubscription & ListNotification
    const subRow = mapPushSubscriptionToRow({
      id: 'push-1',
      listId: 'list-orm-1',
      userId: 'owner-1',
      userName: 'Camille',
      enabled: true,
      notifyOnAdd: true,
      notifyOnReserve: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }, now)
    const roundTripSub = mapRowToPushSubscription(subRow as any)
    expect(roundTripSub.userName).toBe('Camille')
    expect(roundTripSub.enabled).toBe(true)

    const notifRow = mapListNotificationToRow({
      id: 'notif-1',
      listId: 'list-orm-1',
      listTitle: 'Noël ORM',
      type: 'item_added',
      title: 'Nouveau cadeau',
      body: 'Camille a ajouté un livre',
      itemId: 'item-orm-1',
      itemTitle: 'Livre Architecture Logicielle',
      createdAt: now.toISOString()
    }, now)
    const roundTripNotif = mapRowToListNotification(notifRow as any)
    expect(roundTripNotif.type).toBe('item_added')
    expect(shouldMemberReceiveNotification(roundTripNotif, { userId: 'other-user', userName: 'Paul' })).toBe(true)

    // Test de l'isolation par injection de dépendance dans WishlistService
    const isolatedRepo = new InMemoryWishlistRepository()
    const isolatedService = new WishlistService(async () => isolatedRepo)
    await isolatedService.saveList(domainList)
    const fetched = await isolatedService.getListById('orm123')
    expect(fetched?.title).toBe('Noël ORM')
  })
})
