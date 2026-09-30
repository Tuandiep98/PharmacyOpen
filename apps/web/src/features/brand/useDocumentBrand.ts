import { useEffect } from "react";
import { AVATAR_CELL, AVATAR_SPRITE, useBrandIdentity } from "../../brand";

const ICON_SIZE = 64;

/**
 * Tiêu đề tab và favicon đi theo tên + avatar thương hiệu người chơi đã chọn. Favicon cắt một ô từ
 * sprite avatar qua canvas; nếu ảnh chưa tải được thì giữ icon.svg mặc định trong index.html.
 */
export function useDocumentBrand() {
  const { name, avatar } = useBrandIdentity();
  useEffect(() => {
    document.title = name;
  }, [name]);
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = ICON_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const cell = AVATAR_SPRITE / 2;
      const [col, row] = AVATAR_CELL[avatar];
      ctx.beginPath();
      ctx.arc(ICON_SIZE / 2, ICON_SIZE / 2, ICON_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(image, col * cell, row * cell, cell, cell, 0, 0, ICON_SIZE, ICON_SIZE);
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.type = "image/png";
      link.href = canvas.toDataURL("image/png");
    };
    image.src = `${import.meta.env.BASE_URL}brand-avatars.webp`;
    return () => {
      cancelled = true;
    };
  }, [avatar]);
}
