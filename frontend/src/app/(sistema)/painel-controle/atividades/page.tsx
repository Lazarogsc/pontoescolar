import type { Metadata } from "next";
import { Cabecalho, Cartao, Vazio, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { AbasPainel, dataHora } from "../Abas";

export const metadata: Metadata = { title: "Registro de atividades" };

export default async function AtividadesPage({ searchParams }: PageProps<"/painel-controle/atividades">) {
  const { busca } = await searchParams;
  const termo = typeof busca === "string" ? busca : "";
  const [, atividades] = await Promise.all([exigir("admin"), api.atividades(termo)]);

  return (
    <>
      <Cabecalho titulo="Registro de atividades" subtitulo="Entradas no sistema, matrículas, mudanças de usuários e configurações" />
      <AbasPainel atual="/painel-controle/atividades" />
      <Cartao>
        <form className={ui.filtros} role="search">
          <input name="busca" defaultValue={termo} placeholder="Buscar por pessoa, ação ou detalhe" aria-label="Buscar atividade" />
          <button className="btn btn-secundario" type="submit">
            Buscar
          </button>
        </form>
        {atividades.length === 0 ? (
          <Vazio>Nada encontrado.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Quem</th>
                  <th>Ação</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {atividades.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{dataHora(a.quando)}</td>
                    <td>
                      {a.usuario}
                      {a.login && <span className={`mono ${ui.suave}`}> @{a.login}</span>}
                    </td>
                    <td>
                      <strong>{a.acao}</strong>
                    </td>
                    <td className={ui.suave} style={{ whiteSpace: "normal" }}>
                      {a.detalhe || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={ui.contagem} style={{ marginTop: 10 }}>
          Mostrando as 200 mais recentes (o sistema guarda as últimas 500).
        </p>
      </Cartao>
    </>
  );
}
