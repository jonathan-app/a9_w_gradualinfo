import InsightRoll from "@/src/components/About/InsightRoll";


const insights = [
    "+20 negócios impulsionados",
    "+350% crescimento médio",
    "+100k leads gerados",
    "98% clientes satisfeitos",
    "Landing pages em até 7 dias úteis",
    "Sites, conteúdo e automação com IA",
    "Funis pensados para empresas locais",
  ];

export default function AboutLayout({ children }) {
  return (
    <main className="w-full flex flex-col items-center justify-between">
      <InsightRoll insights={insights} />
      {children}
    </main>
  );
}
