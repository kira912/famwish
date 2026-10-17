import { test, expect } from '@playwright/test'

test.describe('Parcours critique E2E FamWish', () => {
  test('Création de liste, visibilité du bouton Ajouter un cadeau, rejoindre une liste (affichage du nom) et réservation anti-spoiler', async ({ browser }) => {
    // 1. Contexte Propriétaire (Sophie)
    const ownerContext = await browser.newContext()
    const ownerPage = await ownerContext.newPage()

    await ownerPage.goto('/')
    await expect(ownerPage.locator('h1')).toContainText('Les souhaits de toute la famille')

    // Ouvrir la modale de création de liste
    await ownerPage.getByRole('button', { name: /Créer une liste/i }).first().click()
    await expect(ownerPage.getByRole('dialog')).toBeVisible()

    // Remplir le titre et le prénom du créateur
    await ownerPage.getByPlaceholder(/Ex: Mes souhaits pour Noël/i).fill('Noël Magique 2026')
    await ownerPage.getByPlaceholder(/Ex: Sophie, Papa, Julien/i).fill('Sophie')
    await ownerPage.getByRole('button', { name: /Créer la liste/i }).click()

    // Vérifier la redirection vers la page de la liste /lists/[id]
    await expect(ownerPage).toHaveURL(/\/lists\/list-/)
    const listUrl = ownerPage.url()

    // Vérifier que le titre et le créateur (Sophie) sont affichés dans la bannière des membres
    await expect(ownerPage.locator('#list-detail-title')).toHaveText('Noël Magique 2026')
    await expect(ownerPage.getByText('Membres (1) :')).toBeVisible()
    await expect(ownerPage.locator('section[aria-labelledby="list-detail-title"]')).toContainText('Sophie')

    // Vérifier que les boutons d'ajout de cadeau sont bien visibles (bannière + barre membres + état vide)
    const headerAddBtn = ownerPage.locator('section[aria-labelledby="list-detail-title"]').getByRole('button', { name: /Ajouter un cadeau/i })
    const sectionAddBtn = ownerPage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /Ajouter un cadeau/i })
    await expect(headerAddBtn).toBeVisible()
    await expect(sectionAddBtn).toBeVisible()

    // Récupérer le code d'invitation affiché sur la bannière
    const inviteCodeBtn = ownerPage.locator('button[title="Cliquer pour copier le code"]')
    await expect(inviteCodeBtn).toBeVisible()
    const inviteCode = (await inviteCodeBtn.innerText()).trim()
    expect(inviteCode.length).toBeGreaterThanOrEqual(4)

    // Ajouter un cadeau pour Sophie
    await headerAddBtn.click()
    const addModal = ownerPage.getByRole('dialog')
    await expect(addModal).toBeVisible()
    await addModal.getByPlaceholder(/Ex: Lego Star Wars/i).fill('Pull en cachemire rouge')
    await addModal.getByPlaceholder(/Ex: 49.99/i).fill('89.90')
    await addModal.getByRole('button', { name: /Ajouter à la liste/i }).click()

    // Vérifier que le cadeau apparaît dans la grille ET que la carte "+ Ajouter un nouveau cadeau" est visible dans la grille
    await expect(ownerPage.getByRole('heading', { name: 'Pull en cachemire rouge' })).toBeVisible()
    await expect(ownerPage.getByRole('button', { name: /Ajouter un nouveau cadeau/i })).toBeVisible()

    // 2. Contexte Invité (Tonton Marc rejoint la liste avec le code)
    const guestContext = await browser.newContext()
    const guestPage = await guestContext.newPage()

    await guestPage.goto(`/join?code=${encodeURIComponent(inviteCode)}`)
    await expect(guestPage.getByRole('heading', { name: 'Noël Magique 2026' })).toBeVisible()

    // Tonton Marc saisit son prénom et rejoint la liste
    await guestPage.getByPlaceholder(/Ex: Papy André, Manon, Sophie/i).fill('Tonton Marc')
    await guestPage.getByRole('button', { name: /Accéder à la liste/i }).click()

    // Vérifier la redirection sur la liste
    await expect(guestPage).toHaveURL(listUrl)

    // CRITIQUE : Vérifier que le nom de "Tonton Marc" apparaît sur la liste (dans l'en-tête ET dans les onglets des membres)
    await expect(guestPage.getByText('Membres (2) :')).toBeVisible()
    await expect(guestPage.locator('section[aria-labelledby="list-detail-title"]')).toContainText('Tonton Marc')
    const marcMemberTab = guestPage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /Tonton Marc/i })
    await expect(marcMemberTab).toBeVisible()

    // Vérifier que Tonton Marc voit aussi le bouton d'ajout de cadeau bien visible dans l'en-tête
    await expect(
      guestPage.locator('section[aria-labelledby="list-detail-title"]').getByRole('button', { name: /Ajouter un cadeau/i })
    ).toBeVisible()

    // Cliquer sur l'onglet de Tonton Marc (qui a 0 cadeau) et vérifier le bouton dédié "Ajouter un cadeau pour Tonton Marc"
    await marcMemberTab.click()
    await expect(guestPage.getByText('Aucun cadeau pour Tonton Marc pour le moment')).toBeVisible()
    await expect(guestPage.getByRole('button', { name: /Ajouter un cadeau pour Tonton Marc/i }).first()).toBeVisible()

    // Revenir sur "Toute la famille" et réserver le cadeau de Sophie
    await guestPage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /Toute la famille/i }).click()
    await guestPage.getByRole('button', { name: /Mettre dans ma hotte pour Noël|Réserver ce cadeau/i }).click()
    await guestPage.getByRole('button', { name: /Confirmer la réservation/i }).click()

    // Tonton Marc voit que le cadeau est réservé
    await expect(guestPage.getByText(/Réservé par vous/i)).toBeVisible()

    // 3. Retour côté Propriétaire (Sophie) : vérifier qu'elle voit bien "Tonton Marc" sur sa liste ET que le mode anti-spoiler protège la surprise
    await ownerPage.reload()
    await expect(ownerPage.getByText('Membres (2) :')).toBeVisible()
    await expect(ownerPage.locator('section[aria-labelledby="list-detail-title"]')).toContainText('Tonton Marc')
    await expect(
      ownerPage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /Tonton Marc/i })
    ).toBeVisible()

    // Vérifier aussi sur l'accueil que la carte de liste (ListCard) affiche bien Tonton Marc et 2 membres
    await ownerPage.goto('/')
    await expect(ownerPage.getByText('2 membres')).toBeVisible()
    await expect(ownerPage.getByText('Tonton Marc')).toBeVisible()

    // Anti-spoiler sur la liste : Sophie ne doit pas voir "Réservé par vous" ni "Déjà dans la hotte" sur son propre cadeau
    await ownerPage.goto(listUrl)
    await expect(ownerPage.getByText(/Déjà dans la hotte/i)).toHaveCount(0)

    await ownerContext.close()
    await guestContext.close()
  })
})
