import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, Cabecalho, Cartao, Tag, Vazio, ui } from "@/components/ui";
import { api, NaoEncontrado } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { dataHora } from "../../Abas";
import { alternarAtivo, encerrarSessoes } from "../../actions";
import { FormSenhaAdmin } from "../../FormSenhaAdmin";
import { FormUsuario } from "../../FormUsuario";

async function carregar(id: string) {
  try {
    return await api.usuario(id);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

export async function generateMetadata({ params }: PageProps<"/painel-controle/usuarios/[id]">) {
  const { id } = await params;
  return { title: `Usuário ${id}` };
}

export default async function UsuarioPage({ params, searchParams }: PageProps<"/painel-controle/usuarios/[id]">) {
  const [{ id }, { criado }] = await Promise.all([params, searchParams]);
  const [eu, u, opcoes] = await Promise.all([exigir("admin"), carregar(id), api.adminOpcoes()]);
  const souEu = u.id === eu.id;

  return (
    <>
      <Cabecalho titulo={u.nome} subtitulo={`@${u.login} · ${u.setor}${u.perfil === "superadmin" ? " · Superadmin" : ""}`}>
        <Link className="btn btn-secundario" href="/painel-controle">
          ← Painel de Controle
        </Link>
      </Cabecalho>

      {criado && (
        <Aviso tom="ok">
          Usuário criado. Passe o login <strong className="mono">{u.login}</strong> e a senha inicial para a pessoa
          {u.trocar_senha ? " — ela vai definir uma senha nova no primeiro acesso." : "."}
        </Aviso>
      )}

      <div className={ui.grade}>
        <Cartao titulo="Dados e permissões">
          <FormUsuario opcoes={opcoes} usuario={u} />
        </Cartao>

        <div className={ui.pilha}>
          <Cartao titulo="Situação">
            <dl className={ui.dl}>
              <dt>Conta</dt>
              <dd>{u.ativo ? <Tag tom="ok">Ativa</Tag> : <Tag tom="alerta">Desativada</Tag>}</dd>
              <dt>Senha</dt>
              <dd>{u.trocar_senha ? <Tag tom="aviso">Troca pendente</Tag> : "Definida pela pessoa"}</dd>
              <dt>Sessões abertas</dt>
              <dd>{u.sessoes}</dd>
              <dt>Último acesso</dt>
              <dd className="mono">{dataHora(u.ultimo_acesso)}</dd>
              <dt>Criado em</dt>
              <dd className="mono">{dataHora(u.criado_em)}</dd>
            </dl>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              {!souEu && (
                <form action={alternarAtivo.bind(null, u.id, !u.ativo)}>
                  <BotaoEnviar variante="secundario" enviando="…">
                    {u.ativo ? "Desativar acesso" : "Reativar acesso"}
                  </BotaoEnviar>
                </form>
              )}
              {u.sessoes > 0 && !souEu && (
                <form action={encerrarSessoes.bind(null, u.id)}>
                  <BotaoEnviar variante="secundario" enviando="…">
                    Desconectar agora
                  </BotaoEnviar>
                </form>
              )}
            </div>
            {souEu && (
              <p className={ui.contagem} style={{ marginTop: 12 }}>
                Para trocar a sua própria senha, use <Link href="/perfil">Meu perfil</Link>.
              </p>
            )}
          </Cartao>

          {!souEu && (
            <Cartao titulo="Redefinir senha">
              <FormSenhaAdmin usuarioId={u.id} minimo={opcoes.senha_minima} />
            </Cartao>
          )}

          <Cartao titulo="Histórico">
            {u.atividades.length === 0 ? (
              <Vazio>Nada registrado.</Vazio>
            ) : (
              <ul className={ui.lista}>
                {u.atividades.map((a) => (
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
