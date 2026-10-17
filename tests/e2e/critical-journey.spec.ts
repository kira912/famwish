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
    const marcMemberTab = guestPage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /Tonton Marc/i }).first()
    await expect(marcMemberTab).toBeVisible()

    // Tonton Marc active les notifications push sur la liste
    await guestPage.getByRole('button', { name: /Activer les alertes push/i }).click()
    await expect(guestPage.getByRole('button', { name: /Alertes push activées/i })).toBeVisible()

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
      ownerPage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /Tonton Marc/i }).first()
    ).toBeVisible()

    // Sophie ajoute un deuxième cadeau -> Tonton Marc (abonné aux notifications push) reçoit la notification !
    await ownerPage.locator('section[aria-labelledby="list-detail-title"]').getByRole('button', { name: /Ajouter un cadeau/i }).click()
    const addModal2 = ownerPage.getByRole('dialog')
    await addModal2.getByPlaceholder(/Ex: Lego Star Wars/i).fill('Coffret Thés de Noël')
    await addModal2.getByRole('button', { name: /Ajouter à la liste/i }).click()

    await guestPage.reload()
    await guestPage.getByRole('button', { name: /Notifications push de la liste/i }).click()
    const pushModal = guestPage.getByRole('dialog')
    await expect(pushModal).toBeVisible()
    await expect(pushModal).toContainText('Coffret Thés de Noël')
    await pushModal.getByRole('button', { name: 'Fermer' }).click()

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

  test('Gestion complète d’un enfant sans compte rattaché à un parent dans /lists/[id] (ajout, souhaits, réservation, modification et suppression)', async ({ browser }) => {
    const parentContext = await browser.newContext()
    const parentPage = await parentContext.newPage()

    // 1. Sophie crée une liste de famille
    await parentPage.goto('/')
    await parentPage.getByRole('button', { name: /Créer une liste/i }).first().click()
    await parentPage.getByPlaceholder(/Ex: Mes souhaits pour Noël/i).fill('Noël des Enfants 2026')
    await parentPage.getByPlaceholder(/Ex: Sophie, Papa, Julien/i).fill('Sophie')
    await parentPage.getByRole('button', { name: /Créer la liste/i }).click()

    await expect(parentPage).toHaveURL(/\/lists\/list-/)
    const listUrl = parentPage.url()

    const inviteCodeBtn = parentPage.locator('button[title="Cliquer pour copier le code"]')
    const inviteCode = (await inviteCodeBtn.innerText()).trim()

    // 2. Sophie clique sur "+ Ajouter un enfant 👶"
    await parentPage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /\+ Ajouter un enfant/i }).click()
    const childDialog = parentPage.getByRole('dialog')
    await expect(childDialog).toBeVisible()
    await expect(childDialog.locator('#child-modal-title')).toHaveText('Ajouter un enfant à la liste')

    // Remplir le prénom et l'âge de l'enfant (Lucas, 7 ans), rattaché à Sophie
    await childDialog.getByPlaceholder(/Ex: Lucas, Emma, Léo/i).fill('Lucas')
    await childDialog.getByPlaceholder(/Ex: 6/i).fill('7')
    await expect(childDialog.getByRole('button', { name: /Sophie/i })).toBeVisible()
    await childDialog.getByRole('button', { name: /Ajouter Lucas à la liste/i }).click()

    // 3. Vérifier l'affichage de l'enfant dans les onglets, l'en-tête et le bandeau contextuel enfant
    await expect(parentPage.getByText('Membres (2) :')).toBeVisible()
    await expect(parentPage.locator('section[aria-labelledby="list-detail-title"]')).toContainText('Lucas')
    await expect(parentPage.locator('section[aria-labelledby="members-section-title"]')).toContainText('Enfant de Sophie')
    await expect(parentPage.getByRole('heading', { name: 'Souhaits de Lucas' })).toBeVisible()
    await expect(parentPage.getByText(/Cet enfant n'a pas de compte : sa liste de cadeaux est gérée par/i)).toBeVisible()

    // 4. Sophie ajoute un cadeau pour son enfant Lucas
    await parentPage.getByRole('button', { name: /Ajouter un cadeau pour Lucas/i }).first().click()
    const addGiftModal = parentPage.getByRole('dialog')
    await expect(addGiftModal).toBeVisible()
    await addGiftModal.getByPlaceholder(/Ex: Lego Star Wars/i).fill('Château Lego Harry Potter')
    await addGiftModal.getByPlaceholder(/Ex: 49.99/i).fill('119.99')
    await addGiftModal.getByRole('button', { name: /Ajouter à la liste/i }).click()

    // Vérifier la carte du cadeau avec le badge enfant + rattachement au parent
    await expect(parentPage.getByRole('heading', { name: 'Château Lego Harry Potter' })).toBeVisible()
    await expect(parentPage.getByText('Pour Lucas', { exact: true }).first()).toBeVisible()

    // 5. Un proche (Tonton Marc) rejoint la liste, réserve le cadeau de Lucas et ajoute sa propre fille Emma
    const relativeContext = await browser.newContext()
    const relativePage = await relativeContext.newPage()

    await relativePage.goto(`/join?code=${encodeURIComponent(inviteCode)}`)
    await relativePage.getByPlaceholder(/Ex: Papy André, Manon, Sophie/i).fill('Tonton Marc')
    await relativePage.getByRole('button', { name: /Accéder à la liste/i }).click()
    await expect(relativePage).toHaveURL(listUrl)

    // Tonton Marc filtre sur Lucas et réserve son cadeau
    await relativePage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /Lucas/i }).first().click()
    await expect(relativePage.getByRole('heading', { name: 'Château Lego Harry Potter' })).toBeVisible()
    await relativePage.getByRole('button', { name: /Mettre dans ma hotte pour Noël|Réserver ce cadeau/i }).click()
    await relativePage.getByRole('button', { name: /Confirmer la réservation/i }).click()
    await expect(relativePage.getByText(/Réservé par vous/i)).toBeVisible()

    // Tonton Marc ajoute sa fille Emma (5 ans), rattachée à Tonton Marc
    await relativePage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /\+ Ajouter un enfant/i }).click()
    const marcChildDialog = relativePage.getByRole('dialog')
    await marcChildDialog.getByPlaceholder(/Ex: Lucas, Emma, Léo/i).fill('Emma')
    await marcChildDialog.getByPlaceholder(/Ex: 6/i).fill('5')
    await marcChildDialog.getByRole('button', { name: /Ajouter Emma à la liste/i }).click()

    await expect(relativePage.getByRole('heading', { name: 'Souhaits de Emma' })).toBeVisible()
    await expect(relativePage.locator('section[aria-labelledby="members-section-title"]')).toContainText('Enfant de Tonton Marc')

    // Tonton Marc modifie l'âge d'Emma (de 5 à 6 ans)
    await relativePage.getByRole('button', { name: 'Modifier l\'enfant' }).click()
    const editChildDialog = relativePage.getByRole('dialog')
    await expect(editChildDialog.locator('#child-modal-title')).toHaveText('Modifier le profil enfant')
    await editChildDialog.getByPlaceholder(/Ex: 6/i).fill('6')
    await editChildDialog.getByRole('button', { name: /Enregistrer les modifications/i }).click()
    await expect(relativePage.locator('section[aria-labelledby="members-section-title"]')).toContainText('(6 ans)')

    // 6. Retour côté Sophie (Parent de Lucas) : comme Lucas n'a pas de compte, Sophie voit que le cadeau de Lucas est réservé pour éviter les doublons
    await parentPage.reload()
    await parentPage.locator('section[aria-labelledby="members-section-title"]').getByRole('button', { name: /Lucas/i }).first().click()
    await expect(parentPage.getByText(/Déjà réservé|Déjà dans la hotte/i).first()).toBeVisible()

    // 7. Suppression d'Emma par Tonton Marc
    relativePage.once('dialog', dialog => dialog.accept())
    await relativePage.getByRole('button', { name: 'Retirer l\'enfant' }).click()
    await expect(relativePage.getByRole('heading', { name: 'Souhaits de Emma' })).toHaveCount(0)

    await parentContext.close()
    await relativeContext.close()
  })
})
