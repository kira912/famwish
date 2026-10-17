import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveList,
  getListById,
  getLists,
  addMemberToList,
  saveItem,
  deleteItem,
  togglePurchaseItem,
  deleteList
} from '../../server/utils/db'
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
})
