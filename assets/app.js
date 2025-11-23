(function () {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function initMenu() {
    const menu = document.querySelector('.side-menu');
    const overlay = document.querySelector('.topbar__overlay');
    const toggle = document.querySelector('.menu-toggle');
    const close = document.querySelector('.side-menu__close');

    if (!menu || !overlay || !toggle || !close) return;

    const closeMenu = () => {
      menu.classList.remove('open');
      overlay.classList.remove('visible');
    };

    const openMenu = () => {
      menu.classList.add('open');
      overlay.classList.add('visible');
    };

    toggle.addEventListener('click', openMenu);
    close.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
    $$('.side-menu a').forEach((link) => link.addEventListener('click', closeMenu));
  }

  function initYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  // ======= API Помощь =======
  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg = (data && data.error) || res.statusText || 'Ошибка запроса';
      throw new Error(msg);
    }
    return data;
  }

  function formatDate(d) {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ======= API Блога =======
  function renderBlog() {
    const page = document.body.dataset.page;
    if (page !== 'blog') return;

    const postsContainer = document.getElementById('posts');
    const postEditor = document.getElementById('post-editor');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');
    const authTabs = document.querySelectorAll('.auth-tabs__btn');

    const userPanel = document.getElementById('user-panel');
    const authStatus = document.getElementById('auth-status');
    const currentUserEl = document.getElementById('current-user');
    const currentEmailEl = document.getElementById('current-email');
    const currentRoleEl = document.getElementById('current-role');
    const logoutBtn = document.getElementById('logout-btn');

    if (
      !postsContainer ||
      !loginForm ||
      !registerForm ||
      !verifyForm ||
      !userPanel ||
      !authStatus
    ) {
      return;
    }

    let posts = [];
    let currentUser = null; // { id, nickname, email, role, verified }

    async function loadPosts() {
      try {
        const data = await api('/api/posts');
        posts = Array.isArray(data.posts) ? data.posts : [];
        renderPosts();
      } catch (e) {
        console.error(e);
        postsContainer.innerHTML = '<p class="text-muted">Не удалось загрузить посты.</p>';
      }
    }

    function updateAuthUI() {
      if (currentUser) {
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        verifyForm.classList.add('hidden');
        userPanel.classList.remove('hidden');
        // скрываем вкладки входа/регистрации
        document.querySelector('.auth-tabs')?.classList.add('hidden');

        authStatus.textContent = currentUser.nickname;
        currentUserEl.textContent = currentUser.nickname;
        currentEmailEl.textContent = currentUser.email;
        currentRoleEl.textContent =
          currentUser.role === 'admin' ? 'Администратор' : 'Игрок';

        if (postEditor) {
          postEditor.classList.toggle(
            'hidden',
            !(currentUser.role === 'admin' && currentUser.verified),
          );
        }
      } else {
        userPanel.classList.add('hidden');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        verifyForm.classList.add('hidden');
        document.querySelector('.auth-tabs')?.classList.remove('hidden');
        authStatus.textContent = 'Не вошли';
        if (postEditor) postEditor.classList.add('hidden');
      }
      renderPosts();
    }

    function renderPosts() {
      postsContainer.innerHTML = '';
      if (!posts.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Постов пока нет. Администратор может создать первый пост.';
        empty.className = 'text-muted';
        postsContainer.appendChild(empty);
        return;
      }

      const sorted = [...posts].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      sorted.forEach((post) => {
        const article = document.createElement('article');
        article.className = 'post';

        const meta = document.createElement('div');
        meta.className = 'post__meta';

        const metaLeft = document.createElement('div');
        metaLeft.className = 'post__meta-left';
        const authorSpan = document.createElement('span');
        authorSpan.textContent = post.author;
        const timeSpan = document.createElement('span');
        timeSpan.textContent = formatDate(post.createdAt);
        metaLeft.appendChild(authorSpan);
        metaLeft.appendChild(document.createTextNode(' • '));
        metaLeft.appendChild(timeSpan);
        meta.appendChild(metaLeft);

        if (currentUser && currentUser.role === 'admin' && currentUser.verified) {
          const menu = document.createElement('div');
          menu.className = 'post-menu';

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'post-menu__button';
          btn.setAttribute('aria-label', 'Действия с постом');

          const dots = document.createElement('span');
          dots.className = 'post-menu__dots';
          dots.innerHTML = '<span></span><span></span><span></span>';

          btn.appendChild(dots);
          menu.appendChild(btn);

          const dropdown = document.createElement('div');
          dropdown.className = 'post-menu__dropdown hidden';

          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'post-menu__item';
          editBtn.textContent = 'Редактировать пост';

          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'post-menu__item post-menu__item--danger';
          deleteBtn.textContent = 'Удалить пост';

          dropdown.appendChild(editBtn);
          dropdown.appendChild(deleteBtn);
          menu.appendChild(dropdown);
          meta.appendChild(menu);

          const closeAllMenus = () => {
            document
              .querySelectorAll('.post-menu__dropdown')
              .forEach((el) => el.classList.add('hidden'));
          };

          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            closeAllMenus();
            if (isHidden) dropdown.classList.remove('hidden');
          });

          document.addEventListener('click', closeAllMenus, { once: true });

          editBtn.addEventListener('click', () => {
            dropdown.classList.add('hidden');
            const titleEl = article.querySelector('.post__title');
            const contentEl = article.querySelector('.post__content');

            if (!titleEl || !contentEl) return;

            // Создаём инлайн-форму
            const editor = document.createElement('form');
            editor.className = 'vertical-form post-edit-form';
            editor.innerHTML = `
              <label class="field">
                <span>Заголовок</span>
                <input type="text" name="title" required maxlength="120" value="${
                  post.title.replace(/"/g, '&quot;')
                }" />
              </label>
              <label class="field">
                <span>Содержимое</span>
                <textarea name="content" required rows="4" maxlength="4000">${
                  post.content
                }</textarea>
              </label>
              <div style="display:flex; gap:8px; margin-top:4px;">
                <button type="submit" class="btn btn--primary btn--small">Сохранить</button>
                <button type="button" class="btn btn--outline btn--small" data-action="cancel">Отмена</button>
              </div>
            `;

            // Скрываем исходный текст
            titleEl.classList.add('hidden');
            contentEl.classList.add('hidden');

            // Вставляем редактор сразу под содержимым
            contentEl.insertAdjacentElement('afterend', editor);

            const cancelBtn = editor.querySelector('[data-action="cancel"]');

            cancelBtn.addEventListener('click', () => {
              editor.remove();
              titleEl.classList.remove('hidden');
              contentEl.classList.remove('hidden');
            });

            editor.addEventListener('submit', async (e) => {
              e.preventDefault();
              const fd = new FormData(editor);
              const newTitle = String(fd.get('title') || '').trim();
              const newContent = String(fd.get('content') || '').trim();
              if (!newTitle || !newContent) return;

              try {
                const data = await api(`/api/posts/${post.id}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    title: newTitle,
                    content: newContent,
                    authorId: currentUser.id,
                  }),
                });
                posts = posts.map((p) => (p.id === post.id ? data.post : p));
                renderPosts();
              } catch (err) {
                alert(err.message || 'Не удалось обновить пост');
              }
            });
          });

          deleteBtn.addEventListener('click', async () => {
            if (!confirm('Удалить этот пост? Это действие нельзя отменить.')) return;
            try {
              await api(`/api/posts/${post.id}`, {
                method: 'DELETE',
                body: JSON.stringify({ authorId: currentUser.id }),
              });
              posts = posts.filter((p) => p.id !== post.id);
              renderPosts();
            } catch (e) {
              alert(e.message || 'Не удалось удалить пост');
            }
          });
        }

        const title = document.createElement('h2');
        title.className = 'post__title';
        title.textContent = post.title;

        const content = document.createElement('p');
        content.className = 'post__content';
        content.textContent = post.content;

        const tags = document.createElement('div');
        tags.className = 'post__tags';
        const badge = document.createElement('span');
        badge.className = 'badge badge--admin';
        badge.textContent = 'Официальный пост проекта';
        tags.appendChild(badge);

        const comments = document.createElement('section');
        comments.className = 'comments';

        const commentsTitle = document.createElement('p');
        commentsTitle.className = 'comments__title';
        commentsTitle.textContent = 'Комментарии';
        comments.appendChild(commentsTitle);

        const list = document.createElement('ul');
        list.className = 'comment-list';

        if (post.comments && post.comments.length) {
          post.comments
            .slice()
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .forEach((cmt) => {
              const li = document.createElement('li');
              li.className = 'comment';

              const metaRow = document.createElement('div');
              metaRow.className = 'comment__meta';

              const author = document.createElement('span');
              author.className = 'comment__author';
              author.textContent = cmt.author;

              const time = document.createElement('span');
              time.className = 'comment__time';
              time.textContent = formatDate(cmt.createdAt);

              metaRow.appendChild(author);
              if (cmt.authorRole === 'admin') {
                const roleBadge = document.createElement('span');
                roleBadge.className = 'badge badge--role-admin';
                roleBadge.textContent = 'Админ';
                metaRow.appendChild(roleBadge);
              }
              metaRow.appendChild(time);

              const body = document.createElement('p');
              body.className = 'comment__body';
              body.textContent = cmt.content;

              li.appendChild(metaRow);
              li.appendChild(body);
              list.appendChild(li);
            });
        } else {
          const empty = document.createElement('li');
          empty.className = 'comment';
          empty.textContent = 'Комментариев ещё нет. Станьте первым!';
          list.appendChild(empty);
        }
        comments.appendChild(list);

        const form = document.createElement('form');
        form.className = 'comment-form';

        const disabled = !currentUser || !currentUser.verified;
        const placeholder = !currentUser
          ? 'Чтобы комментировать, войдите или зарегистрируйтесь'
          : !currentUser.verified
          ? 'Подтвердите аккаунт по коду из почты, чтобы комментировать'
          : 'Напишите своё мнение о посте';

        form.innerHTML = `
          <label class="field">
            <span>Ваш комментарий</span>
            <textarea name="content" required maxlength="800" placeholder="${placeholder}" ${
              disabled ? 'disabled' : ''
            }></textarea>
          </label>
          <button type="submit" class="btn btn--outline btn--small" ${
            disabled ? 'disabled' : ''
          }>Отправить комментарий</button>
        `;

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!currentUser || !currentUser.verified) {
            alert('Комментировать могут только вошедшие и подтверждённые пользователи.');
            return;
          }
          const textarea = form.querySelector('textarea');
          const text = textarea.value.trim();
          if (!text) return;

          try {
            const data = await api(`/api/posts/${post.id}/comments`, {
              method: 'POST',
              body: JSON.stringify({
                authorId: currentUser.id,
                content: text,
              }),
            });
            const idx = posts.findIndex((p) => p.id === post.id);
            if (idx !== -1) {
              posts[idx].comments = posts[idx].comments || [];
              posts[idx].comments.push(data.comment);
              renderPosts();
            }
          } catch (err) {
            alert(err.message || 'Не удалось отправить комментарий');
          }
        });

        comments.appendChild(form);

        article.appendChild(meta);
        article.appendChild(title);
        article.appendChild(content);
        article.appendChild(tags);
        article.appendChild(comments);
        postsContainer.appendChild(article);
      });
    }

    // ======= AUTH HANDLERS (API) =======
    authTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        authTabs.forEach((b) => b.classList.remove('auth-tabs__btn--active'));
        btn.classList.add('auth-tabs__btn--active');
        const tab = btn.dataset.tab;
        if (tab === 'login') {
          loginForm.classList.remove('hidden');
          registerForm.classList.add('hidden');
        } else {
          loginForm.classList.add('hidden');
          registerForm.classList.remove('hidden');
        }
        verifyForm.classList.add('hidden');
      });
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '').trim();
      try {
        const data = await api('/api/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        currentUser = data.user;
        updateAuthUI();
      } catch (err) {
        alert(err.message || 'Неверная почта или пароль. Попробуйте ещё раз.');
      }
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const nickname = String(formData.get('nickname') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '').trim();
      if (!nickname || !email || !password) return;

      try {
        const data = await api('/api/register', {
          method: 'POST',
          body: JSON.stringify({ nickname, email, password }),
        });
        alert(`Код подтверждения (для теста показан здесь): ${data.code}`);
        registerForm.classList.add('hidden');
        verifyForm.classList.remove('hidden');

        verifyForm.onsubmit = async (ev) => {
          ev.preventDefault();
          const fd = new FormData(verifyForm);
          const inputCode = String(fd.get('code') || '').trim();
          try {
            await api('/api/verify', {
              method: 'POST',
              body: JSON.stringify({ email, code: inputCode }),
            });
            alert('Аккаунт подтверждён. Теперь вы можете войти.');
            verifyForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            loginForm.email.value = email;
          } catch (err2) {
            alert(err2.message || 'Не удалось подтвердить аккаунт');
          }
        };
      } catch (err) {
        alert(err.message || 'Не удалось зарегистрироваться');
      }
    });

    logoutBtn.addEventListener('click', () => {
      currentUser = null;
      updateAuthUI();
    });

    if (postEditor) {
      const newPostForm = document.getElementById('new-post-form');
      if (newPostForm) {
        newPostForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!currentUser || currentUser.role !== 'admin' || !currentUser.verified) {
            alert('Только подтверждённый администратор может создавать посты.');
            return;
          }
          const formData = new FormData(newPostForm);
          const title = String(formData.get('title') || '').trim();
          const content = String(formData.get('content') || '').trim();
          if (!title || !content) return;

          try {
            const data = await api('/api/posts', {
              method: 'POST',
              body: JSON.stringify({
                title,
                content,
                authorId: currentUser.id,
              }),
            });
            posts.unshift(data.post);
            newPostForm.reset();
            renderPosts();
          } catch (err) {
            alert(err.message || 'Не удалось создать пост');
          }
        });
      }
    }

    // начальная загрузк��
    loadPosts();
    updateAuthUI();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMenu();
    initYear();
    renderBlog();
  });
})();
