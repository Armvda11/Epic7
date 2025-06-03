# Test RTA Simple - Configuration Seeder Exacte

## Configuration basée sur les seeders :

### Utilisateurs (ordre de création dans UserSeeder.java):
- ID 1: admin@epic7.com (Admin) 
- ID 2: hermas@example.com (hermas)
- ID 3: arya@example.com (arya)
- ID 4: corentin@example.com (Kaldah)

### Héros (ordre de création dans HeroSeeder.java):
- heroes.get(0) = Hwayoung (DARK) - ATK:1208, SPD:102, DEF:616, HP:6488
- heroes.get(1) = Ml Piera (DARK) - ATK:885, SPD:115, DEF:613, HP:6149
- heroes.get(2) = Mavuika (ICE) - ATK:100, SPD:100, DEF:100, HP:1000
- heroes.get(3) = Krau (LIGHT) - ATK:1200, SPD:100, DEF:700, HP:7000
- heroes.get(4) = Harsetti (ICE) - ATK:800, SPD:115, DEF:550, HP:6000
- heroes.get(5) = Ylinav (DARK) - ATK:1100, SPD:105, DEF:650, HP:6700

### Héros possédés (PlayerSeeder.java):
- hermas (userID=2): heroes.get(0), heroes.get(1), heroes.get(5), heroes.get(3)
  → Hwayoung, Ml Piera, Ylinav, Krau
- arya (userID=3): heroes.get(0), heroes.get(1), heroes.get(5), heroes.get(3)  
  → Hwayoung, Ml Piera, Ylinav, Krau

## Test simple : Combat 2vs2 avec ordre des tours
