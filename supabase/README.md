# Supabase: configuração para uso privado

1. Crie um projeto Supabase e execute `schema.sql` no SQL Editor.
2. Em Authentication → Settings, desative o cadastro público.
3. Crie as duas contas em Authentication → Users com e-mail e senha. Anote os UUIDs; o app não oferece cadastro público. O e-mail é usado somente no servidor para autenticar a conta e não aparece na tela de login.
4. Associe os IDs às duas pessoas no SQL Editor. Cole o UUID exatamente como aparece no Supabase (sem letras extras antes dele):

   ```sql
   insert into public.profiles (id, display_name)
   values
     ('UUID-DA-CONTA-ISABEL', 'Isabel'),
     ('UUID-DA-CONTA-BIA', 'Bia');
   ```

5. Copie Project URL e a chave `anon`/publishable em Project Settings → API para `.env.local` na raiz:

   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica
   ```

6. Instale/abra o Supabase CLI, faça login e publique a função que converte o nome escolhido no e-mail da conta somente no servidor:

   ```bash
   npx supabase login
   npx supabase functions deploy username-login --project-ref xqmeukoobimjlrhafbve
   ```

7. Reinicie `npm run dev`. O login passa a aceitar `Isa` (ou `Isabel`) e `Bia`, com as senhas das contas criadas no passo 3. Cartas, rascunhos, respostas, leitura e introdução são persistidos no banco. O schema também habilita Realtime para atualizar a caixa de entrada enquanto o site estiver aberto.

Nunca coloque uma chave `service_role` no frontend. O acesso é protegido pelas políticas RLS de `schema.sql`.

A Edge Function usa as credenciais administrativas disponíveis no ambiente Supabase para localizar a conta; não cadastre nem exponha uma chave `service_role` em `.env.local` ou no frontend.

## Modelo de segurança

- A identidade vem de `auth.uid()`, nunca de um `userId` enviado livremente pela interface.
- A função de membro confere a existência do perfil provisionado; não há política para criação de perfil pelo cliente.
- O autor vê os próprios rascunhos. A destinatária só lê uma carta depois da publicação.
- As respostas só são liberadas aos participantes de uma carta publicada e só podem ser criadas pela destinatária, após a data de abertura.
- A caixa de entrada pode consultar `letter_reads` para obter leitura e contar cartas não lidas.
- O estado da introdução é salvo no perfil da Bia, então não reaparece em outros dispositivos depois de concluído.

Se as variáveis do Supabase não estiverem presentes, o site continua em modo de demonstração local. `localStorage` não é adequado para conteúdo privado em produção.
