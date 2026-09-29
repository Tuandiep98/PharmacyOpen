import { useState } from 'react';
import { BRAND_AVATARS, saveBrandIdentity, useBrandIdentity, type BrandAvatar } from '../../brand';
import { GameButton } from '../../ui/primitives';

export function BrandAvatarImage({ avatar, size = 40 }: { avatar: BrandAvatar; size?: number }) {
  return <span className={`brand-avatar brand-avatar-${avatar}`} style={{ width: size, height: size }} role="img" aria-label={BRAND_AVATARS.find((item) => item.id === avatar)?.label} />;
}

export function BrandDialog({ onClose }: { onClose: () => void }) {
  const identity = useBrandIdentity();
  const [name, setName] = useState(identity.name);
  const [avatar, setAvatar] = useState(identity.avatar);
  return <div className="modal-backdrop"><form className="modal brand-dialog" role="dialog" aria-modal="true" aria-labelledby="brand-title" onSubmit={(event) => { event.preventDefault(); saveBrandIdentity({ name, avatar }); onClose(); }}>
    <h1 id="brand-title">Tên và hình tiệm</h1>
    <label htmlFor="brand-name">Tên nhà thuốc</label>
    <input id="brand-name" autoFocus maxLength={24} value={name} onChange={(event) => setName(event.target.value)} required />
    <p className="small muted">Tên sẽ hiện trên bảng hiệu và thanh trên cùng. Tối đa 24 ký tự.</p>
    <fieldset><legend>Hình đại diện thương hiệu</legend><div className="brand-avatar-options">{BRAND_AVATARS.map((item) => <label key={item.id} className={avatar === item.id ? 'chosen' : ''}><input type="radio" name="brand-avatar" value={item.id} checked={avatar === item.id} onChange={() => setAvatar(item.id)} /><BrandAvatarImage avatar={item.id} size={62} /><span>{item.label}</span></label>)}</div></fieldset>
    <div className="modal-actions"><GameButton tone="primary" size="large" type="submit">Lưu nhận diện</GameButton><GameButton type="button" onClick={onClose}>Đóng</GameButton></div>
  </form></div>;
}
