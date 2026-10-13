import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, ui } from "@/components/ui";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { exigir, pode } from "@/lib/sessao";

export const metadata: Metadata = { title: "Meu RH" };

export default async function MeuRhPage() {
  const u = await exigir("meu_rh", "rh_gestao");
  // Quem não faz gestão de RH vai direto para o próprio ponto.
  if (!pode(u, "rh_gestao")) {
    if (u.funcionario_id) redirect(`/meu-rh/${u.funcionario_id}`);
    return (
      <>
        <Cabecalho titulo="Meu RH" />
        <Cartao>
          <p className={ui.contagem}>Seu usuário ainda não está vinculado a um funcionário. Peça ao administrador do sistema para fazer o vínculo.</p>
        </Cartao>
      </>
    );
  }
  const funcionarios = await api.funcionarios();
  const setores = [...new Set(funcionarios.map((f) => f.setor))];

  return (
    <>
      <Cabecalho titulo="Gestão de RH" subtitulo="Ponto, horas extras, banco de horas e atestados de cada funcionário" />

      {u.funcionario_id && (
        <p className={ui.contagem}>
          <Link href={`/meu-rh/${u.funcionario_id}`}>Ir para o meu ponto →</Link>
        </p>
      )}

      <div className={ui.grade3}>
        {setores.map((setor) => (
          <Cartao key={setor} titulo={setor}>
            <ul className={ui.lista}>
              {funcionarios
                .filter((f) => f.setor === setor)
                .map((f) => (
                  <li key={f.id}>
                    <div>
                      <Link href={`/meu-rh/${f.id}`}>
                        <strong>{f.nome}</strong>
                      </Link>
                      <span>{f.cargo}</span>
                    </div>
                    <span className="mono">{f.jornada_diaria}</span>
                  </li>
                ))}
            </ul>
          </Cartao>
        ))}
      </div>
    </>
  );
}
