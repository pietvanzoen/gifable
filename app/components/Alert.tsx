export default function Alert({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="error" role="alert">
      {children}
    </div>
  );
}
