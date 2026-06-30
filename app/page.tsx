import AuthProvider from "@/components/AuthProvider";
import InvoiceBuilder from "@/components/InvoiceBuilder";

export default function Home() {
  return (
    <AuthProvider>
      <InvoiceBuilder />
    </AuthProvider>
  );
}
