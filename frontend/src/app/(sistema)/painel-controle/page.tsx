import type { Metadata } from "next";
import Link from "next/link";
import { Barras, Cabecalho, Cartao, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { AbasPainel, dataHora } from "./Abas";

export const metadata: Metadata = { title: "Painel de Controle" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function PainelControlePage({ searchParams }: PageProps<"/painel-controle">) {
  const sp = await searchParams;
  const filtros = { busca: texto(sp.busca), setor: texto(sp.setor), situacao: texto(sp.situacao) };
  const [eu, resumo, opcoes, usuarios] = await Promise.all([exigir("admin"), api.adminResumo(), api.adminOpcoes(), api.usuarios(filtros)]);

  return (
    <>
      <Cabecalho titulo="Painel de Controle" subtitulo="Usuários, senhas, setores e configurações do sistema">
        <Link className="btn btn-primario" href="/painel-controle/usuarios/novo">
          + Novo usuário
        </Link>
      </Cabecalho>

      <AbasPainel atual="/painel-controle" />

      <Kpis
        itens={[
          { rotulo: "Usuários ativos", valor: String(resumo.ativos), variacao: `${resumo.usuarios - resumo.ativos} desativados`, tendencia: "neutral" },
          { rotulo: "Conectados agora", valor: String(resumo.online), variacao: "Com sessão aberta", tendencia: "neutral" },
          { rotulo: "Superadmins", valor: String(resumo.superadmins), variacao: "Controlam o sistema", tendencia: "neutral" },
          {
            rotulo: "Troca de senha pendente",
            valor: String(resumo.pendentes_senha),
            variacao: "Ainda com a senha inicial",
            tendencia: resumo.pendentes_senha ? "down" : "up",
          },
        ]}
      />

      <div className={ui.grade}>
        <Cartao titulo="Usuários">
          <form className={ui.filtros} role="search">
            <input name="busca" defaultValue={filtros.busca} placeholder="Buscar por nome, login ou e-mail" aria-label="Buscar usuário" />
            <select name="setor" defaultValue={filtros.setor} aria-label="Filtrar por setor">
              <option value="">Todos os setores</option>
              {opcoes.setores.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select name="situacao" defaultValue={filtros.situacao} aria-label="Filtrar por situação">
              <option value="">Ativos e desativados</option>
              <option value="ativos">Só ativos</option>
              <option value="inativos">Só desativados</option>
            </select>
            <button className="btn btn-secundario" type="submit">
              Filtrar
            </button>
          </form>

          {usuarios.length === 0 ? (
            <Vazio>Nenhum usuário encontrado.</Vazio>
          ) : (
            <div className={ui.tabelaWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Setor</th>
                    <th>Situação</th>
                    <th>Último acesso</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <Link href={`/painel-controle/usuarios/${u.id}`}>{u.nome}</Link>
                        {u.id === eu.id && <span className={ui.suave}> (você)</span>}
                        <br />
                        <span className={`mono ${ui.suave}`}>@{u.login}</span>
                        {u.email && <span className={ui.suave}> · {u.email}</span>}
                      </td>
                      <td>
                        {u.setor}
                        {u.perfil === "superadmin" && (
                          <>
                            {" "}
                            <Tag tom="neutro">Superadmin</Tag>
                          </>
                        )}
                        <br />
                        <span className={ui.suave}>
                          {u.funcionario ?? (u.matriculas.length ? `${u.matriculas.length} aluno(s) vinculado(s)` : "")}
                        </span>
                      </td>
                      <td>
                        {u.ativo ? <Tag tom="ok">Ativo</Tag> : <Tag tom="alerta">Desativado</Tag>}{" "}
                        {u.trocar_senha && u.ativo && <Tag tom="aviso">Senha pendente</Tag>} {u.sessoes > 0 && <Tag tom="neutro">Conectado</Tag>}
                      </td>
                      <td className={`mono ${ui.suave}`}>{dataHora(u.ultimo_acesso)}</td>
                      <td>
                        <Link href={`/painel-controle/usuarios/${u.id}`} className={ui.suave}>
                          Gerenciar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>

        <div className={ui.pilha}>
          <Cartao titulo="Usuários ativos por setor">
            <Barras itens={resumo.por_setor.map((s) => ({ nome: s.nome, valor: s.total }))} formatar={(v) => String(v)} />
          </Cartao>
          <Cartao titulo="Atividade recente" extra={<Link href="/painel-controle/atividades">Ver tudo</Link>}>
            {resumo.atividades.length === 0 ? (
              <Vazio>Nada registrado ainda.</Vazio>
            ) : (
              <ul className={ui.lista}>
                {resumo.atividades.map((a) => (
                  <li key={a.id}>
                    <div>
                      <strong>{a.acao}</strong>
                      <span>
                        {a.usuario}
                        {a.detalhe && ` · ${a.detalhe}`}
                      </span>
                    </div>
                    <span className="mono">{dataHora(a.quando)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
