import { PrismaClient, Role, DiningSection, GalleryCategory, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding AURA Edinburgh Database ---');

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Refusing to run the development seed script in production without ALLOW_PRODUCTION_SEED=true.');
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const sommelierPassword = process.env.SEED_SOMMELIER_PASSWORD;
  if (!adminPassword || !sommelierPassword) {
    throw new Error('Set SEED_ADMIN_PASSWORD and SEED_SOMMELIER_PASSWORD before seeding.');
  }

  // 1. Seed Users (Admin & Sommelier)
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash(adminPassword, salt);
  const sommelierPasswordHash = await bcrypt.hash(sommelierPassword, salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@aura-edinburgh.com' },
    update: {},
    create: {
      email: 'admin@aura-edinburgh.com',
      passwordHash: adminPasswordHash,
      firstName: 'Euan',
      lastName: 'Macleod',
      phone: '+44 (0)131 556 8920',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'sommelier@aura-edinburgh.com' },
    update: {},
    create: {
      email: 'sommelier@aura-edinburgh.com',
      passwordHash: sommelierPasswordHash,
      firstName: 'Fiona',
      lastName: 'Sinclair',
      phone: '+44 (0)131 556 8921',
      role: Role.SOMMELIER,
    },
  });

  console.log('✔ Seeded Admin & Sommelier accounts');

  // 2. Seed Restaurant Profile
  await prisma.restaurant.upsert({
    where: { slug: 'aura-edinburgh' },
    update: {},
    create: {
      name: 'AURA Edinburgh',
      slug: 'aura-edinburgh',
      stars: 'Two Michelin Stars',
      chefPatron: 'Euan Macleod',
      headSommelier: 'Fiona Sinclair',
      address: '14–16 Royal Terrace Vaults, Edinburgh, EH7 5TB, Scotland',
      phone: '+44 (0)131 556 8920',
      email: 'reservations@aura-edinburgh.com',
      maxCapacity: 28,
      openingHours: [
        { days: 'Wednesday – Saturday', service: 'Dinner', times: '17:30 – 23:00', lastSitting: '20:30' },
        { days: 'Friday & Saturday', service: 'Lunch', times: '12:00 – 14:30', lastSitting: '13:15' },
        { days: 'Sunday', service: 'Sunday Supper Tasting', times: '17:00 – 22:00', lastSitting: '19:45' },
        { days: 'Monday & Tuesday', service: 'Closed', times: 'Foraging & Cellar Expeditions', lastSitting: '-' },
      ],
      coordinates: { lat: 55.9575, lng: -3.1818 },
    },
  });

  console.log('✔ Seeded Restaurant profile');

  // 3. Seed Categories
  const catTasting = await prisma.category.upsert({
    where: { slug: 'tasting' },
    update: {},
    create: {
      name: 'Tasting Signature',
      slug: 'tasting',
      description: 'Sequential 8-course degustation courses',
      displayOrder: 1,
    },
  });

  const catAlacarte = await prisma.category.upsert({
    where: { slug: 'alacarte' },
    update: {},
    create: {
      name: 'Highland & Coastal À La Carte',
      slug: 'alacarte',
      description: 'Individual seasonal dishes',
      displayOrder: 2,
    },
  });

  const catPlant = await prisma.category.upsert({
    where: { slug: 'plant' },
    update: {},
    create: {
      name: 'Foraged & Plant-Based',
      slug: 'plant',
      description: 'Caledonian wild flora, ancient grains and roots',
      displayOrder: 3,
    },
  });

  console.log('✔ Seeded Categories');

  // 4. Seed Dishes
  const dishesData = [
    {
      slug: 'orkney-scallop',
      name: 'Hand-Dived Orkney Scallop',
      gaelicName: 'Sgàilleag Arcaibh',
      categoryId: catTasting.id,
      courseNumber: 2,
      description: 'Lightly torched Orkney scallop with smoked bone marrow dashi, coastal scurvy grass, and fermented sea buckthorn oil pearls.',
      story: 'Harvested by diver Kevin MacLeod in the freezing tidal flows of Scapa Flow. Plated within 24 hours of landing.',
      provenance: 'Scapa Flow, Orkney Islands (Hand-dived by Kevin MacLeod)',
      price: new Prisma.Decimal(34),
      image: 'https://images.unsplash.com/photo-1612204078213-a227dba74093?auto=format&fit=crop&w=1200&q=85',
      isSignature: true,
      isChefRecommendation: true,
      winePairing: {
        name: 'Puligny-Montrachet 1er Cru "Les Folatières"',
        producer: 'Domaine Alain Chavy',
        vintage: '2020',
        region: 'Burgundy, France',
        notes: 'Crisp flint minerality with subtle hazelnut and white peach.',
      },
      dietary: ['gluten-free', 'pescatarian'],
      allergens: ['Molluscs', 'Fish'],
    },
    {
      slug: 'skye-langoustine',
      name: 'Isle of Skye Langoustine',
      gaelicName: 'Giomach an Eilein Sgitheanaich',
      categoryId: catTasting.id,
      courseNumber: 3,
      description: 'Butter-poached langoustine tail glazed with heather honey and birch sap vinegar, accompanied by pickled sea aster and crispy langoustine coral tuile.',
      story: 'Creel-caught in Loch Bracadale under the shadow of the Cuillin Mountains.',
      provenance: 'Loch Bracadale, Isle of Skye',
      price: new Prisma.Decimal(38),
      image: 'https://images.unsplash.com/photo-1722525576811-3e1345b83481?auto=format&fit=crop&w=1200&q=85',
      isSignature: true,
      isChefRecommendation: true,
      winePairing: {
        name: 'Meursault "Les Narvaux"',
        producer: 'Vincent Girardin',
        vintage: '2019',
        region: 'Côte de Beaune, France',
        notes: 'Opulent brioche notes balanced with saline acidity.',
      },
      dietary: ['gluten-free', 'pescatarian'],
      allergens: ['Crustaceans', 'Dairy'],
    },
    {
      slug: 'highland-venison',
      name: 'Wild Highland Red Deer',
      gaelicName: 'Fiadh Ruadh na Gàidhealtachd',
      categoryId: catTasting.id,
      courseNumber: 5,
      description: 'Saddle of red deer smoked over dried peat and Scots pine needles, paired with celeriac fondant, fermented rowanberry gel, and peated whisky jus.',
      story: 'Estate-culled wild venison from the Cairngorms National Park.',
      provenance: 'Mar Lodge Estate, Cairngorms National Park',
      price: new Prisma.Decimal(48),
      image: 'https://images.unsplash.com/photo-1574969884448-fe5bce3d0d51?auto=format&fit=crop&w=1200&q=85',
      isSignature: true,
      isChefRecommendation: true,
      winePairing: {
        name: 'Côte-Rôtie "La Landonne"',
        producer: 'Domaine René Rostaing',
        vintage: '2017',
        region: 'Northern Rhône, France',
        notes: 'Smoky, peppery dark blackberry profile with savoury leather tones.',
      },
      dietary: ['gluten-free', 'dairy-free'],
      allergens: [],
    },
    {
      slug: 'river-tweed-trout',
      name: 'Smoked River Tweed Sea Trout',
      gaelicName: 'Breac-mara Abhainn Thuaidh',
      categoryId: catAlacarte.id,
      courseNumber: 1,
      description: 'Cold-smoked sea trout cured in Edinburgh Gin botanicals, served with horseradish buttermilk emulsion, wild sorrel, and crisp buckwheat chips.',
      story: 'Caught from the pristine waters of the Scottish Borders.',
      provenance: 'River Tweed, Scottish Borders',
      price: new Prisma.Decimal(29),
      image: 'https://images.unsplash.com/photo-1747633083434-9ad50963593c?auto=format&fit=crop&w=1200&q=85',
      isSignature: false,
      isChefRecommendation: false,
      winePairing: {
        name: 'Chablis Grand Cru "Les Clos"',
        producer: 'Domaine Christian Moreau',
        vintage: '2021',
        region: 'Chablis, France',
        notes: 'Stony tension and lemon curd aromas that slice through the unctuous smoke.',
      },
      dietary: ['gluten-free', 'pescatarian'],
      allergens: ['Fish', 'Dairy'],
    },
    {
      slug: 'isle-of-mull-gougere',
      name: 'Isle of Mull Cheddar Gougères',
      gaelicName: 'Càise Mhuile',
      categoryId: catTasting.id,
      courseNumber: 6,
      description: 'Puff gougères filled with 18-month unpasteurised Isle of Mull clothbound cheddar mousse, glazed with black winter truffle honey.',
      story: 'From the Reade family farm in Tobermory, where cows feed on fermented spent distillery grains.',
      provenance: 'Sgriob-ruadh Farm, Tobermory, Isle of Mull',
      price: new Prisma.Decimal(22),
      image: '/images/gougeres.jpg',
      isSignature: true,
      isChefRecommendation: false,
      winePairing: {
        name: 'Arbois Vin Jaune',
        producer: 'Domaine Rolet',
        vintage: '2015',
        region: 'Jura, France',
        notes: 'Intense walnut, fenugreek, and dry salinity complement raw Scottish cheddar.',
      },
      dietary: ['vegetarian', 'nut-free'],
      allergens: ['Dairy', 'Gluten', 'Eggs'],
    },
    {
      slug: 'galloway-beef',
      name: 'Dry-Aged Galloway Beef Sirloin',
      gaelicName: 'Mairtfheoil Gall-Ghàidhealaibh',
      categoryId: catAlacarte.id,
      courseNumber: 4,
      description: '60-day dry-aged belted Galloway beef, charred Roscoff onion cups filled with marrow crumb, roasted chanterelles, and smoked lovage emulsion.',
      story: 'Belted Galloway cattle grass-fed on heather hillsides in Dumfries and Galloway.',
      provenance: 'Loch Arthur, Dumfries & Galloway',
      price: new Prisma.Decimal(52),
      image: 'https://images.unsplash.com/photo-1558199141-391d935676f0?auto=format&fit=crop&w=1200&q=85',
      isSignature: false,
      isChefRecommendation: true,
      winePairing: {
        name: 'Château Pichon Baron 2ème Grand Cru Classé',
        producer: 'Château Pichon Baron',
        vintage: '2016',
        region: 'Pauillac, Bordeaux, France',
        notes: 'Structured cassis, cedarwood, and velvety tannins echoing dry-aged beef depth.',
      },
      dietary: ['gluten-free'],
      allergens: ['Dairy'],
    },
    {
      slug: 'foraged-chanterelles',
      name: 'Inverness Chanterelle & Spelt Porridge',
      gaelicName: 'Balgan-buachair & Brot Coirce',
      categoryId: catPlant.id,
      courseNumber: 3,
      description: 'Golden Scottish chanterelles pan-glazed in brown butter, ancient spelt grain porridge cooked in toasted hazelnut milk, fermented wild garlic oil.',
      story: 'Hand-picked during misty autumn dawns in the Caledonian pine forests near Inverness.',
      provenance: 'Strathspey Forests, Inverness-shire',
      price: new Prisma.Decimal(32),
      image: '/images/chanterelles.jpg',
      isSignature: false,
      isChefRecommendation: true,
      winePairing: {
        name: 'Savennières "Roche aux Moines"',
        producer: 'Domaine aux Moines',
        vintage: '2020',
        region: 'Loire Valley, France',
        notes: 'Textured Chenin Blanc with dried orchard fruit and wet stone.',
      },
      dietary: ['vegetarian', 'dairy-free'],
      allergens: ['Nuts', 'Gluten'],
    },
    {
      slug: 'salt-baked-celeriac',
      name: 'Salt-Baked Heritage Celeriac',
      gaelicName: 'Meacan-eala Bèicearachd',
      categoryId: catPlant.id,
      courseNumber: 4,
      description: 'Root celeriac baked inside a coastal seaweed salt crust, roasted hazelnut butter, charred sweet leek puree, shaved Scottish autumn black truffle.',
      story: 'East Lothian organic celeriac encased in Fife coastal kelp dough.',
      provenance: 'East Lothian Organic Farm, East Lothian',
      price: new Prisma.Decimal(30),
      image: '/images/celeriac.jpg',
      isSignature: true,
      isChefRecommendation: false,
      winePairing: {
        name: 'Grüner Veltliner Smaragd "Kellerberg"',
        producer: 'F.X. Pichler',
        vintage: '2021',
        region: 'Wachau, Austria',
        notes: 'White pepper spice, green tobacco, and stony minerality that elevate roasted root vegetable.',
      },
      dietary: ['vegan', 'vegetarian', 'gluten-free'],
      allergens: ['Nuts'],
    },
    {
      slug: 'sea-buckthorn-tart',
      name: 'Foraged Sea Buckthorn & Meadowsweet',
      gaelicName: 'Càiseag Muir-bhealaidh',
      categoryId: catTasting.id,
      courseNumber: 7,
      description: 'Crisp roasted buckwheat tartlet filled with tangy sea buckthorn curd, burnt Scottish heather honey caramel, and sheep’s milk yogurt gelato.',
      story: 'Bright orange sea buckthorn berries harvested along the windswept dunes of Yellowcraigs beach, East Lothian.',
      provenance: 'Yellowcraigs Coastal Dunes, East Lothian',
      price: new Prisma.Decimal(24),
      image: 'https://images.unsplash.com/photo-1785695797215-4345de8ab06c?auto=format&fit=crop&w=1200&q=85',
      isSignature: true,
      isChefRecommendation: false,
      winePairing: {
        name: 'Tokaji Aszú 5 Puttonyos',
        producer: 'Royal Tokaji Wine Company',
        vintage: '2017',
        region: 'Tokaj, Hungary',
        notes: 'Honeyed apricot and candied citrus with soaring natural acidity.',
      },
      dietary: ['vegetarian', 'nut-free'],
      allergens: ['Dairy', 'Gluten', 'Eggs'],
    },
    {
      slug: 'peat-smoked-chocolate',
      name: 'Peat-Smoked Chocolate & Single Malt',
      gaelicName: 'Teòclaid Smùidteach & Uisge-beatha',
      categoryId: catTasting.id,
      courseNumber: 8,
      description: '70% Ecuadorian single-estate dark chocolate infused with Islay peat smoke, barley malt crumble, and salted heather caramel.',
      story: 'Conceived in collaboration with the historic Bowmore Distillery on Islay.',
      provenance: 'Handcrafted in Edinburgh with Islay Single Malt',
      price: new Prisma.Decimal(26),
      image: 'https://images.unsplash.com/photo-1768326119181-5f3cfe0adb4c?auto=format&fit=crop&w=1200&q=85',
      isSignature: true,
      isChefRecommendation: true,
      winePairing: {
        name: '20-Year-Old Tawny Port',
        producer: 'Taylor Fladgate',
        vintage: 'NV',
        region: 'Douro Valley, Portugal',
        notes: 'Layers of roasted fig, dried plum, and walnut echoing peat smoke and dark chocolate.',
      },
      dietary: ['vegetarian'],
      allergens: ['Dairy', 'Gluten'],
    },
  ];

  for (const dish of dishesData) {
    await prisma.dish.upsert({
      where: { slug: dish.slug },
      update: dish,
      create: dish,
    });
  }

  console.log('✔ Seeded Dishes');

  // 5. Seed Tasting Menus
  await prisma.tastingMenu.upsert({
    where: { slug: 'autumn-terroir' },
    update: {},
    create: {
      slug: 'autumn-terroir',
      title: 'The Autumn Terroir',
      subtitle: 'An 8-course odyssey celebrating Scotland’s rivers, lochs, forests, and heather moors.',
      description: 'Conceived by Chef Patron Euan Macleod, this tasting journey bridges timeless Scottish heritage with modernist culinary precision.',
      price: new Prisma.Decimal(175),
      pairingPrice: new Prisma.Decimal(115),
      prestigePairingPrice: new Prisma.Decimal(195),
      coursesCount: 8,
      duration: '3 hours',
      courses: [
        { number: 1, title: 'Hebridean Seaweed Brot', pairing: 'NV Billecart-Salmon Brut Rosé Champagne' },
        { number: 2, title: 'Hand-Dived Orkney Scallop', pairing: '2020 Puligny-Montrachet 1er Cru' },
        { number: 3, title: 'Isle of Skye Langoustine', pairing: '2019 Meursault "Les Narvaux"' },
        { number: 4, title: 'Smoked River Tweed Trout', pairing: '2021 Chablis Grand Cru' },
        { number: 5, title: 'Wild Highland Red Deer', pairing: '2017 Côte-Rôtie "La Landonne"' },
        { number: 6, title: 'Isle of Mull Cheddar Gougère', pairing: '2015 Arbois Vin Jaune' },
        { number: 7, title: 'Foraged Sea Buckthorn & Meadowsweet', pairing: '2017 Tokaji Aszú 5 Puttonyos' },
        { number: 8, title: 'Peat-Smoked Chocolate & Single Malt', pairing: '20-Year-Old Tawny Port' },
      ],
    },
  });

  console.log('✔ Seeded Tasting Menus');

  // 6. Seed Dining Tables
  const tables = [
    { tableNumber: 1, capacity: 2, section: DiningSection.DINING_ROOM },
    { tableNumber: 2, capacity: 2, section: DiningSection.DINING_ROOM },
    { tableNumber: 3, capacity: 4, section: DiningSection.DINING_ROOM },
    { tableNumber: 4, capacity: 4, section: DiningSection.DINING_ROOM },
    { tableNumber: 5, capacity: 6, section: DiningSection.DINING_ROOM },
    { tableNumber: 6, capacity: 6, section: DiningSection.CHEFS_COUNTER },
    { tableNumber: 7, capacity: 4, section: DiningSection.VAULT_ALCOVE },
  ];

  for (const t of tables) {
    await prisma.diningTable.upsert({
      where: { tableNumber: t.tableNumber },
      update: {},
      create: t,
    });
  }

  console.log('✔ Seeded Dining Tables');

  // 7. Seed Reviews & Accolades
  const reviews = [
    {
      publication: 'The Michelin Guide UK',
      author: 'Chief Inspector',
      quote: 'Two Stars — Euan Macleod crafts an unhurried culinary masterclass in the historic Georgian vaults of Edinburgh. Dishes exhibit exceptional terroir clarity, razor-sharp technical restraint, and an intoxicating sense of place.',
      rating: 'Two Michelin Stars',
      year: '2025 Edition',
      badge: '2 Michelin Stars',
      isApproved: true,
      isFeatured: true,
    },
    {
      publication: 'The Times',
      author: 'Giles Coren',
      quote: 'The most electrifying dining room in northern Europe. The hand-dived scallop with bone marrow dashi will haunt your dreams for years to come.',
      rating: '10 / 10',
      year: '2025',
      badge: 'Restaurant of the Year',
      isApproved: true,
      isFeatured: true,
    },
  ];

  for (const r of reviews) {
    await prisma.review.create({ data: r });
  }

  console.log('✔ Seeded Reviews & Accolades');

  // 8. Seed Gallery Items
  await prisma.galleryItem.deleteMany({});

  const gallery = [
    {
      title: 'The Plated Scallop',
      category: GalleryCategory.CULINARY,
      imageUrl: 'https://images.unsplash.com/photo-1612204078213-a227dba74093?auto=format&fit=crop&w=1200&q=85',
      caption: 'Orkney hand-dived scallop with bone marrow dashi.',
    },
    {
      title: 'The Vault Dining Room',
      category: GalleryCategory.AMBIANCE,
      imageUrl: '/images/vault_dining.jpg',
      caption: 'Intimate candlelit dining in our restored 18th-century stone vaults.',
    },
    {
      title: 'Chef’s Atelier Counter',
      category: GalleryCategory.AMBIANCE,
      imageUrl: '/images/chef_counter.jpg',
      caption: 'Exclusive front-row counter seating with view of the open culinary pass.',
    },
    {
      title: 'Isle of Skye Langoustine',
      category: GalleryCategory.CULINARY,
      imageUrl: 'https://images.unsplash.com/photo-1722525576811-3e1345b83481?auto=format&fit=crop&w=1200&q=85',
      caption: 'Loch Bracadale langoustine glazed in Scottish heather honey.',
    },
    {
      title: 'The Sea Buckthorn Tartlet',
      category: GalleryCategory.CULINARY,
      imageUrl: 'https://images.unsplash.com/photo-1785695797215-4345de8ab06c?auto=format&fit=crop&w=1200&q=85',
      caption: 'Buckwheat shell, sea buckthorn curd, burnt honey caramel, and sheep milk gelato.',
    },
    {
      title: 'Galloway Dry-Aged Ribeye',
      category: GalleryCategory.CULINARY,
      imageUrl: 'https://images.unsplash.com/photo-1558199141-391d935676f0?auto=format&fit=crop&w=1200&q=85',
      caption: 'Himalayan salt-aged Galloway beef with charred Roscoff onions.',
    },
  ];

  for (const g of gallery) {
    await prisma.galleryItem.create({ data: g });
  }

  console.log('✔ Seeded Gallery items');

  console.log('--- AURA Edinburgh Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seeding error: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
