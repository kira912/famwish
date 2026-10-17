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
  deleteList
} from '../../server/utils/db'
import {
  mapRowToWishlist,
  mapRowToWishlistItem,
  mapWishlistToRow,
  mapWishlistItemToRow
} from '../../server/database/mappers'
import { wishlistsTable, wishlistItemsTable } from '../../server/database/schema'
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
          role: 'owner'
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

  it('valide les mappers bidirectionnels Drizzle ORM <-> Entités Domaine et l’injection de Repository', async () => {
    expect(wishlistsTable).toBeDefined()
    expect(wishlistItemsTable).toBeDefined()

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

    // Test de l'isolation par injection de dépendance dans WishlistService
    const isolatedRepo = new InMemoryWishlistRepository()
    const isolatedService = new WishlistService(async () => isolatedRepo)
    await isolatedService.saveList(domainList)
    const fetched = await isolatedService.getListById('orm123')
    expect(fetched?.title).toBe('Noël ORM')
  })
})
