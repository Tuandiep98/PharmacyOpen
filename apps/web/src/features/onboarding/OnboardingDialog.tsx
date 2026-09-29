import { useState } from 'react';
import { DandelionLogo } from '../../art/Furniture';
import { BoxIcon, ClinicIcon, StaffIcon } from '../../art/Icons';
import { ProductIcon } from '../../art/Products';
import { playSfx } from '../../audio/sfx';
import { useBrandIdentity } from '../../brand';
import { GameButton } from '../../ui/primitives';
import { SaveSection } from '../save/SaveSection';

const STEP_COUNT = 4;

export function OnboardingDialog({ seed, showSave, onClose }: { seed: number; showSave: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const identity = useBrandIdentity();
  const next = () => {
    playSfx('page');
    if (step === STEP_COUNT - 1) onClose();
    else setStep(step + 1);
  };
  return <div className="modal-backdrop">
    <div className="modal onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-progress" aria-label={`Hướng dẫn ${step + 1} trên ${STEP_COUNT}`}>
        {Array.from({ length: STEP_COUNT }, (_, i) => <span key={i} className={i === step ? 'current' : i < step ? 'done' : ''} />)}
      </div>
      <div className="onboarding-body">
      {step === 0 && <>
        <div className="onboarding-art"><svg width={64} height={64} viewBox="-15 -15 30 30" aria-hidden><DandelionLogo r={14} /></svg></div>
        <h1 id="onboarding-title">Chào mừng đến {identity.name}</h1>
        <p>Điều hành một tiệm nhỏ: nghe khách, chọn đồ phù hợp, chăm kệ và xây đội ngũ.</p>
        <ul className="disclaimer">
          <li>Đây là trò chơi mô phỏng. Cửa hàng, nhãn hiệu, sản phẩm và nhân vật đều là hư cấu.</li>
          <li>Nội dung trong game không phải lời khuyên y tế và không thay thế bác sĩ hay dược sĩ.</li>
          <li>Khi khách mô tả triệu chứng, hành động đúng trong game luôn là khuyên khách đi khám.</li>
        </ul>
        {showSave && <GameButton tone="quiet" onClick={() => setStep(STEP_COUNT - 1)}>Bản lưu & cài đặt</GameButton>}
      </>}
      {step === 1 && <>
        <div className="onboarding-art"><ProductIcon id="mask" size={52} /><span className="onboarding-speech">“Cho mình khẩu trang nhé!”</span></div>
        <h1 id="onboarding-title">Nghe khách ở quầy</h1>
        <p>Khách có thể gọi tên món hoặc kể một nhu cầu thường ngày. Nhìn câu nói, rồi tìm món trong nhóm hàng phù hợp.</p>
        <p className="small muted">Tiệm mới chỉ có 4 món. Khi bán đủ hàng và qua ngày, hãy nâng Kho và Cửa hàng trong mục Mở rộng để có thêm món mới.</p>
      </>}
      {step === 2 && <>
        <div className="onboarding-art"><ProductIcon id="mask" size={52} /><span className="onboarding-arrow">→</span><span className="onboarding-target">Khách</span></div>
        <h1 id="onboarding-title">Một chạm để phục vụ</h1>
        <p>Chạm món trong khay, hoặc kéo từ kệ hay khay vào khách. Đưa đúng món thì thanh toán tự diễn ra.</p>
        <p className="small muted">Món hết hàng có nút “+ Nhập”. Món có nhãn Bán chạy được khách hỏi nhiều hơn; xem giá nhập trong tab Kho trước khi nhập.</p>
      </>}
      {step === 3 && <>
        <div className="onboarding-art"><ClinicIcon size={42} /><BoxIcon size={42} /><StaffIcon size={42} /></div>
        <h1 id="onboarding-title">Giữ tiệm vận hành</h1>
        <p>Khách mô tả triệu chứng: bấm “Khuyên đi khám”. Không chọn sản phẩm cho lượt này.</p>
        <p>Vào Nhân sự để tuyển người và giao quầy. Nhân viên sẽ phục vụ khi bạn vắng mặt; kho, đánh giá và sổ sách giúp bạn theo dõi tiệm.</p>
        {showSave && <SaveSection />}
      </>}
      <p className="muted small">Bản thử nghiệm · seed {seed} · Font Nunito (SIL OFL 1.1) · canvas-confetti (ISC)</p>
      </div>
      <div className="onboarding-actions">
        {step > 0 && <GameButton onClick={() => { playSfx('page'); setStep(step - 1); }}>Quay lại</GameButton>}
        <GameButton tone="primary" onClick={next} autoFocus>{step === STEP_COUNT - 1 ? 'Vào tiệm' : 'Tiếp theo'}</GameButton>
      </div>
      {step < STEP_COUNT - 1 && <button className="link-btn" onClick={onClose}>Bỏ qua hướng dẫn</button>}
    </div>
  </div>;
}
