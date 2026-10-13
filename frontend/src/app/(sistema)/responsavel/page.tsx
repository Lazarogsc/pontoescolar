import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho, Cartao, Vazio, ui } from "@/components/ui";
import { exigir, pode } from "@/lib/sessao";

export const metadata: Metadata = { title: "Portal do Responsável" };

export default async function PortalPage({ searchParams }: PageProps<"/responsavel">) {
  const [u, { matricula }] = await Promise.all([exigir("portal", "familia"), searchParams]);
  const numero = typeof matricula === "string" ? matricula.replace(/\D/g, "") : "";
  if (numero) redirect(`/responsavel/${numero}`);

  // Pais: vão direto para o filho (ou escolhem entre os filhos vinculados)
  if (!pode(u, "portal")) {
    if (u.matriculas.length === 1) redirect(`/responsavel/${u.matriculas[0]}`);
    return (
      <>
        <Cabecalho titulo="Portal do Responsável" subtitulo="Escolha o aluno para acompanhar" />
        <Cartao titulo="Seus filhos">
          {u.matriculas.length === 0 ? (
            <Vazio>Nenhum aluno vinculado ao seu usuário. Procure a secretaria da escola.</Vazio>
          ) : (
            <ul className={ui.lista}>
              {u.matriculas.map((m) => (
                <li key={m}>
                  <Link href={`/responsavel/${m}`}>
                    <strong>Matrícula {m}</strong>
                  </Link>
                  <span className="mono">Acompanhar →</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </>
    );
  }

  return (
    <>
      <Cabecalho
        titulo="Portal do Responsável"
        subtitulo="Veja o acompanhamento de qualquer aluno como o responsável vê: notas, provas, atividades e mensalidades"
      />

      <Cartao titulo="Abrir o acompanhamento de um aluno">
        <form className={ui.filtros} action="/responsavel">
          <input name="matricula" inputMode="numeric" required placeholder="Número da matrícula" aria-label="Número da matrícula" />
          <button className="btn btn-primario" type="submit">
            Abrir
          </button>
        </form>
        <p className={ui.contagem}>
          Para dar acesso a um responsável, crie um usuário do setor “Responsável” no Painel de Controle e vincule as matrículas dos filhos.
        </p>
      </Cartao>
    </>
  );
}
