"""Safely retain originals and inventory the supplied manifest. No property assignments."""
import argparse, collections, csv, hashlib, io, json, pathlib, zipfile
p = argparse.ArgumentParser()
p.add_argument('archive', type=pathlib.Path)
p.add_argument('output', type=pathlib.Path)
a = p.parse_args()
with zipfile.ZipFile(a.archive) as archive:
    files = [item for item in archive.infolist() if not item.is_dir()]
    names = [item.filename for item in files]
    if len(names) != len(set(names)) or sum(item.file_size for item in files) > 1024**3:
        raise ValueError('Duplicate archive paths or archive exceeds 1 GB')
    for item in files:
        path = pathlib.PurePosixPath(item.filename)
        if path.is_absolute() or '..' in path.parts or '\\' in item.filename or ((item.external_attr >> 16) & 0o170000) == 0o120000:
            raise ValueError('Unsafe archive entry')
    manifests = [name for name in names if name.endswith('/MEDIA_MANIFEST.csv')]
    if len(manifests) != 1:
        raise ValueError('Expected one manifest')
    root = pathlib.PurePosixPath(manifests[0]).parent
    rows = list(csv.DictReader(io.StringIO(archive.read(manifests[0]).decode('utf-8-sig'))))
    indexed = []
    seen = collections.defaultdict(list)
    for i, row in enumerate(rows):
        path = root / row['property_group'] / row['source_filename']
        if any('/' in row[key] or '\\' in row[key] or row[key] in ('.', '..') for key in ['property_group', 'source_filename']):
            raise ValueError('Unsafe manifest path')
        if str(path) not in names:
            raise ValueError('Manifest file is missing')
        data = archive.read(str(path))
        digest = hashlib.sha256(data).hexdigest()
        media_id = f'{i + 1:02d}'
        indexed.append({**row, 'id': media_id, 'sha256': digest, 'bytes': len(data), 'path': str((a.output / 'source' / path).resolve())})
        seen[digest].append(media_id)
    media_names = [name for name in names if pathlib.Path(name).suffix.lower() in ('.jpeg', '.jpg', '.png', '.mp4', '.webm')]
    if len(media_names) != len(indexed):
        raise ValueError('Archive media and manifest counts differ')
    a.output.mkdir(parents=True, exist_ok=True)
    archive.extractall(a.output / 'source')
    (a.output / 'audit.json').write_text(json.dumps(indexed, indent=2))
    (a.output / 'archive.json').write_text(json.dumps({'sha256': hashlib.sha256(a.archive.read_bytes()).hexdigest(), 'originalCount':len(rows)},indent=2))
    print(json.dumps({'media':len(rows), 'types': dict(collections.Counter(r['media_type'] for r in rows)), 'groups':len(set(r['property_group'] for r in rows)), 'exactDuplicates':[ids for ids in seen.values() if len(ids)>1]},indent=2))
