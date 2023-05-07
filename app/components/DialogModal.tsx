import { useEffect, useRef } from "react";

export type DialogModalProps = {
  children: React.ReactNode;
  open: boolean;
  onClose?: () => void;
};

export default function DialogModal(props: DialogModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (props.open) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [props.open]);

  return (
    <dialog ref={ref} onClose={props.onClose}>
      {props.children}
    </dialog>
  );
}
