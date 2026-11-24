import json
import os

cards_dir = 'img'
deck_data = {}
deck_file = 'deck.json'

for idx, card in enumerate(os.listdir(cards_dir)):
    deck_data[idx + 1] = f'/{cards_dir}/{card}'

with open(deck_file, 'w') as f:
    json.dump(deck_data, f, indent=2)
