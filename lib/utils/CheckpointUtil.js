export function initCheckpoint(cp) {
  if (cp.loc_type && cp.loc_id) {
    cp[cp.loc_type == 'drive' ? 'drive_id' : 'share_id'] = cp.loc_id
  } else if (cp.drive_id || cp.share_id) {
    cp.loc_type = cp.share_id ? 'share' : 'drive'
    cp.loc_id = cp.share_id || cp.drive_id
  }

  if (cp.file_key) {
    cp['file_id'] = cp.file_key
  } else if (cp.file_id) {
    cp.file_key = cp.file_id
  }

  if (cp.parent_file_key) {
    cp['parent_file_id'] = cp.parent_file_key
  } else if (cp.parent_file_id) {
    cp.parent_file_key = cp.parent_file_id
  }
  return cp
}

export function formatCheckpoint(cp) {
  let isDrive = cp.loc_type == 'drive'

  cp[isDrive ? 'drive_id' : 'share_id'] = cp.loc_id
  cp['file_id'] = cp.file_key
  if (cp.parent_file_key) cp['parent_file_id'] = cp.parent_file_key

  return cp
}
