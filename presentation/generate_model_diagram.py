#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import networkx as nx
import matplotlib.pyplot as plt
import os

# Créer le dossier images s'il n'existe pas
os.makedirs('/Users/hermas/Desktop/Projets/Epic7/presentation/images', exist_ok=True)

# Créer un graphe dirigé
G = nx.DiGraph()

# Définir les entités (nœuds)
entities = [
    "User", "PlayerHero", "Hero", "PlayerEquipment", "Equipment", 
    "Guild", "GuildMembership", "Banner", "Skill", "Message"
]

# Ajouter les nœuds au graphe
for entity in entities:
    G.add_node(entity)

# Définir les relations avec leur type
# Format: (source, target, relation_type)
# Types: 'oneToMany', 'manyToOne', 'manyToMany', 'oneToOne'
relations = [
    # Relations User
    ("User", "PlayerHero", "oneToMany"),
    ("User", "PlayerEquipment", "oneToMany"),
    ("User", "GuildMembership", "oneToOne"),
    ("User", "User", "manyToMany"),
    ("Message", "User", "manyToOne"),
    
    # Relations Hero
    ("Hero", "Skill", "oneToMany"),
    ("Hero", "Banner", "manyToMany"),
    ("PlayerHero", "Hero", "manyToOne"),
    
    # Relations Equipment
    ("PlayerEquipment", "Equipment", "manyToOne"),
    ("Equipment", "Banner", "manyToMany"),
    
    # Relations PlayerHero
    ("PlayerHero", "User", "manyToOne"),
    ("PlayerHero", "PlayerEquipment", "oneToMany"),
    
    # Relations PlayerEquipment
    ("PlayerEquipment", "User", "manyToOne"),
    ("PlayerEquipment", "PlayerHero", "manyToOne"),
    
    # Relations Guild
    ("Guild", "GuildMembership", "oneToMany"),
    ("GuildMembership", "Guild", "manyToOne"),
    ("GuildMembership", "User", "manyToOne")
]

# Ajouter les relations au graphe
for source, target, rel_type in relations:
    G.add_edge(source, target, relation=rel_type)

# Définir les couleurs et styles de flèches pour chaque type de relation
colors = {
    'oneToMany': 'skyblue',
    'manyToOne': 'orange',
    'manyToMany': 'purple',
    'oneToOne': 'green'
}

styles = {
    'oneToMany': '--',
    'manyToOne': '-',
    'manyToMany': ':',
    'oneToOne': '-'
}

widths = {
    'oneToMany': 1.5,
    'manyToOne': 1.5,
    'manyToMany': 1.5,
    'oneToOne': 2.5
}

# Configurer le layout
plt.figure(figsize=(20, 16))
pos = nx.spring_layout(G, k=0.5, seed=42)  # k contrôle la distance entre les nœuds

# Dessiner les nœuds
nx.draw_networkx_nodes(G, pos, node_size=3000, node_color='lightgray', alpha=0.9, linewidths=2, edgecolors='black')

# Dessiner les arêtes par type de relation
for relation_type in set(nx.get_edge_attributes(G, 'relation').values()):
    edges = [(u, v) for u, v, d in G.edges(data=True) if d['relation'] == relation_type]
    nx.draw_networkx_edges(G, pos, edgelist=edges, width=widths[relation_type],
                          edge_color=colors[relation_type], style=styles[relation_type],
                          alpha=0.7, arrowsize=20, connectionstyle='arc3,rad=0.1')

# Ajouter les étiquettes aux arêtes
edge_labels = {}
for u, v, d in G.edges(data=True):
    rel_type = d['relation']
    if rel_type == 'oneToMany':
        label = '1:N'
    elif rel_type == 'manyToOne':
        label = 'N:1'
    elif rel_type == 'manyToMany':
        label = 'N:M'
    else:  # oneToOne
        label = '1:1'
    edge_labels[(u, v)] = label

nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=12, font_family='sans-serif')

# Ajouter les étiquettes aux nœuds
nx.draw_networkx_labels(G, pos, font_size=14, font_family='sans-serif', font_weight='bold')

# Ajouter un titre et une légende
plt.title('Modèle de Données Epic7 - Réseau des Relations', fontsize=20, pad=20)

# Créer la légende manuelle
legend_elements = [
    plt.Line2D([0], [0], color=colors['oneToMany'], linestyle=styles['oneToMany'], lw=2, label='One-to-Many (1:N)'),
    plt.Line2D([0], [0], color=colors['manyToOne'], linestyle=styles['manyToOne'], lw=2, label='Many-to-One (N:1)'),
    plt.Line2D([0], [0], color=colors['manyToMany'], linestyle=styles['manyToMany'], lw=2, label='Many-to-Many (N:M)'),
    plt.Line2D([0], [0], color=colors['oneToOne'], linestyle=styles['oneToOne'], lw=widths['oneToOne'], label='One-to-One (1:1)')
]

plt.legend(handles=legend_elements, loc='upper center', bbox_to_anchor=(0.5, -0.05), ncol=4, fontsize=12)

plt.axis('off')
plt.tight_layout()

# Sauvegarder l'image
plt.savefig('/Users/hermas/Desktop/Projets/Epic7/presentation/images/model_relations_network.png', dpi=300, bbox_inches='tight')

# Générer une version plus simple et plus claire du diagramme
plt.figure(figsize=(20, 16))
pos = nx.circular_layout(G)  # Disposition circulaire pour plus de clarté

# Dessiner les nœuds
nx.draw_networkx_nodes(G, pos, node_size=3000, node_color='lightgray', alpha=0.9, linewidths=2, edgecolors='black')

# Dessiner les arêtes par type de relation
for relation_type in set(nx.get_edge_attributes(G, 'relation').values()):
    edges = [(u, v) for u, v, d in G.edges(data=True) if d['relation'] == relation_type]
    nx.draw_networkx_edges(G, pos, edgelist=edges, width=widths[relation_type],
                          edge_color=colors[relation_type], style=styles[relation_type],
                          alpha=0.7, arrowsize=20)

# Ajouter les étiquettes aux arêtes
nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=12, font_family='sans-serif')

# Ajouter les étiquettes aux nœuds
nx.draw_networkx_labels(G, pos, font_size=14, font_family='sans-serif', font_weight='bold')

# Ajouter un titre
plt.title('Modèle de Données Epic7 - Vue Circulaire', fontsize=20, pad=20)

# Ajouter la légende
plt.legend(handles=legend_elements, loc='upper center', bbox_to_anchor=(0.5, -0.05), ncol=4, fontsize=12)

plt.axis('off')
plt.tight_layout()

# Sauvegarder la deuxième image
plt.savefig('/Users/hermas/Desktop/Projets/Epic7/presentation/images/model_relations_circular.png', dpi=300, bbox_inches='tight')

print("Diagrammes générés avec succès dans le dossier presentation/images !")
