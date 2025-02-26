import React from "react";

interface ModalProps {
  id: string;
  title: string;
  content: React.ReactNode;
  onCloseText?: string;
}

const Modal: React.FC<ModalProps> = ({ id, title, content, onCloseText = 'Close' }) => {
  return (
    <dialog id={id} className="modal modal-open">
      <div className="modal-box relative bg-[#ffffff] text-black dark:bg-[#181818] dark:text-white">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="py-4">{content}</div>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn btn-sm btn-ghost absolute right-2 top-2">
              ✕
            </button>
            <button className="btn">{onCloseText}</button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

export default Modal;
