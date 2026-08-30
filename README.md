# 👕 Dashboard de Coleção de Camisas

Um painel interativo e moderno para gerenciar, visualizar e analisar uma coleção de camisas de futebol. Desenvolvido com as melhores tecnologias do ecossistema front-end, este dashboard oferece métricas detalhadas e gráficos sobre suas aquisições.

## 🔗 Preview (Demonstração)

Acesse o projeto rodando ao vivo através do link abaixo:
👉 **[https://meuacervofc.netlify.app/](https://meuacervofc.netlify.app/)**

## ✨ Funcionalidades

- **Métricas Principais:** Acompanhe rapidamente o total de camisas, tamanho da sua *wishlist*, valor total investido e a data da última aquisição.
- **Gráficos Interativos:** Visualização de dados dinâmicos utilizando a biblioteca Recharts.
  - Distribuição de Camisas por Time e por Marca
  - Gráficos de barra mostrando Aquisições e Gasto Total por Ano
  - Linha do tempo mostrando a Evolução da Coleção
  - Divisão por Tipos de Camisa e Locais de Compra
  - Ranking das Camisas Mais Caras
- **Visualização Detalhada (Modais):** Botões de "Ver Tudo" integrados aos gráficos que abrem listas suspensas (modais) com os dados completos (indo além dos Top 5).
- **Design Polido e Responsivo:** Interface construída com Tailwind CSS e Shadcn UI, adaptável a diferentes tamanhos de tela, com estilização customizada de barras de rolagem e interações (cursores, hovers).
- **Suporte a Temas:** Estrutura pronta para modo claro (Light Mode) e modo escuro (Dark Mode).

## 🚀 Tecnologias Utilizadas

- **[React 18](https://react.dev/)** - Biblioteca principal para construção da interface
- **[Vite](https://vitejs.dev/)** - Bundler e servidor de desenvolvimento super rápido
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática para maior segurança no código
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utilitário para estilização ágil
- **[Recharts](https://recharts.org/)** - Biblioteca robusta para a criação de gráficos SVG em React
- **[Shadcn UI / Base UI](https://ui.shadcn.com/)** - Componentes de interface acessíveis e altamente customizáveis
- **[Lucide React](https://lucide.dev/)** - Pacote de ícones minimalistas e consistentes

## 📦 Como rodar o projeto localmente

Siga os passos abaixo para rodar o projeto na sua máquina:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   ```

2. **Acesse a pasta do projeto:**
   ```bash
   cd SEU_REPOSITORIO
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:3000` (ou na porta indicada no terminal).

## 🛠️ Scripts Disponíveis

No diretório do projeto, você pode rodar os seguintes comandos:

- `npm run dev` - Inicia a aplicação em modo de desenvolvimento.
- `npm run build` - Gera a build otimizada de produção na pasta `dist/`.
- `npm run preview` - Inicia um servidor local para testar a versão gerada no comando de build.
- `npm run lint` - Executa a verificação de regras de código com o ESLint.

## 🤝 Contribuições

Contribuições são muito bem-vindas! Se você tiver uma ideia para melhorar o projeto:

1. Faça um **Fork** do projeto
2. Crie uma **Branch** para sua funcionalidade (`git checkout -b feature/MinhaNovaFeature`)
3. Faça o **Commit** das suas alterações (`git commit -m 'feat: adiciona nova funcionalidade incrível'`)
4. Faça o **Push** para a branch original (`git push origin feature/MinhaNovaFeature`)
5. Abra um **Pull Request**

## 📝 Licença

Este projeto é de código aberto. Sinta-se à vontade para utilizá-lo, modificá-lo e distribuí-lo conforme necessário.
