#!/usr/bin/env python3
"""
Flora Rosario · Conversor CSV → JSON del mapa
Convierte la planilla exportada (Excel / Google Sheets / app Flora Campo .csv)
al JSON en el formato que consumen la página y la app móvil.

USO:
    python3 convertir_csv.py registros.csv  >  lote.json

El CSV debe tener encabezados (los de la app Flora Campo):
    id;_fecha;_speciesName;speciesId;parkName;parkId;lat;lng;_gpsAccuracy;
    addressOrZone;specimenCount;specimenType;estimatedAgeYears;isDyePlant;
    curiosityFact;tiene_foto
Separador ';' y BOM UTF-8 (como exporta la app). También acepta ',' y tab.
"""
import csv, json, sys, re

def slug(s):
    s = str(s or '').lower()
    s = ''.join(c for c in __import__('unicodedata').normalize('NFD', s) if __import__('unicodedata').category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')
    return s

def si_no(v):
    v = str(v or '').strip().lower()
    return v in ('si', 'sí', 'yes', 'true', '1', 'x')

def main(ruta):
    raw = open(ruta, 'rb').read()
    if raw[:3] == b'\xef\xbb\xbf':      # BOM
        raw = raw[3:]
    linea = raw.split(b'\n', 1)[0].decode('utf-8', 'replace')
    sep = ';' if linea.count(';') > linea.count(',') else (',' if linea.count(',') >= linea.count('\t') else '\t')
    lector = csv.DictReader(raw.decode('utf-8-sig').splitlines(), delimiter=sep)
    ejemplares = []
    for i, row in enumerate(lector, 1):
        row = { (k or '').strip(): (v or '').strip() for k, v in row.items() }
        try:
            lat = float(str(row.get('lat', '')).replace(',', '.'))
            lng = float(str(row.get('lng', '')).replace(',', '.'))
        except ValueError:
            print(f'  fila {i}: sin coordenadas, se omite', file=sys.stderr)
            continue
        if not (-33.05 <= lat <= -32.80 and -60.85 <= lng <= -60.40):
            print(f'  fila {i}: coordenada fuera de Rosario, se omite', file=sys.stderr)
            continue
        sp_nombre = row.get('_speciesName') or row.get('especie') or ''
        sp_id = row.get('speciesId') or slug(sp_nombre)
        ejemplares.append({
            'id': row.get('id') or f'{sp_id}_csv{i}',
            'speciesId': sp_id,
            '_speciesName': sp_nombre,
            'parkId': row.get('parkId') or 'otro',
            'parkName': row.get('parkName') or 'Otro lugar',
            'lat': lat, 'lng': lng,
            'addressOrZone': row.get('addressOrZone', ''),
            'specimenCount': int(row['specimenCount']) if str(row.get('specimenCount', '')).strip().isdigit() else 1,
            'specimenType': row.get('specimenType') or 'Ejemplar único',
            'estimatedAgeYears': row.get('estimatedAgeYears', ''),
            'curiosityFact': row.get('curiosityFact', ''),
            'isDyePlant': si_no(row.get('isDyePlant')),
            'foto': None,
            '_gpsAccuracy': None,
            '_fecha': row.get('_fecha', ''),
            '_estado': 'pendiente',
        })
    lote = {
        '_lote': 'csv', '_version': 1,
        '_exportado': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        '_cantidad': len(ejemplares),
        'ejemplares': ejemplares,
    }
    json.dump(lote, sys.stdout, ensure_ascii=False, indent=1)
    print(f'\n✓ {len(ejemplares)} ejemplares convertidos', file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__); sys.exit(1)
    main(sys.argv[1])
