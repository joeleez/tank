(function () {
  'use strict';

  const STORAGE_KEY = 'tank.todos';

  /** @type {{ id: string, text: string, completed: boolean }[]} */
  let todos = [];
  let filter = 'all';
  /** id of todo currently being edited, or null */
  let editingId = null;
  /** skip blur commit after Escape cancel */
  let skipEditBlur = false;

  const form = document.getElementById('todo-form');
  const input = document.getElementById('todo-input');
  const listEl = document.getElementById('todo-list');
  const itemsLeftEl = document.getElementById('items-left');
  const emptyStateEl = document.getElementById('empty-state');
  const toggleAllBtn = document.getElementById('toggle-all-btn');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const filterBtns = document.querySelectorAll('.filter-btn');

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        todos = parsed.filter(
          (t) => t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.completed === 'boolean'
        );
      }
    } catch (_) {
      todos = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  function newId() {
    return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function visibleTodos() {
    if (filter === 'active') return todos.filter((t) => !t.completed);
    if (filter === 'completed') return todos.filter((t) => t.completed);
    return todos;
  }

  function activeCount() {
    return todos.filter((t) => !t.completed).length;
  }

  function updateChrome() {
    const left = activeCount();
    const label = left === 1 ? '1 item left' : left + ' items left';
    itemsLeftEl.textContent = label;

    const hasTodos = todos.length > 0;
    const hasCompleted = todos.some((t) => t.completed);
    toggleAllBtn.disabled = !hasTodos;
    clearCompletedBtn.disabled = !hasCompleted;

    if (hasTodos) {
      const allDone = left === 0;
      toggleAllBtn.textContent = allDone ? 'Unmark all' : 'Mark all complete';
    } else {
      toggleAllBtn.textContent = 'Mark all complete';
    }

    const shown = visibleTodos();
    const showEmpty = shown.length === 0;
    emptyStateEl.hidden = !showEmpty;
    if (showEmpty) {
      if (!hasTodos) {
        emptyStateEl.textContent = 'No todos yet. Add one above.';
      } else if (filter === 'active') {
        emptyStateEl.textContent = 'No active todos.';
      } else if (filter === 'completed') {
        emptyStateEl.textContent = 'No completed todos.';
      } else {
        emptyStateEl.textContent = 'No todos to show.';
      }
    }
  }

  function setFilter(next) {
    filter = next;
    filterBtns.forEach((btn) => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    render();
  }

  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    todos.push({ id: newId(), text: trimmed, completed: false });
    save();
    input.value = '';
    render();
    input.focus();
  }

  function toggleTodo(id) {
    const t = todos.find((x) => x.id === id);
    if (!t) return;
    t.completed = !t.completed;
    save();
    render();
  }

  function deleteTodo(id) {
    if (editingId === id) editingId = null;
    todos = todos.filter((t) => t.id !== id);
    save();
    render();
  }

  function startEdit(id) {
    editingId = id;
    render();
    const editInput = listEl.querySelector('[data-edit-input="' + id + '"]');
    if (editInput) {
      editInput.focus();
      editInput.select();
    }
  }

  function commitEdit(id, value) {
    const trimmed = value.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    const t = todos.find((x) => x.id === id);
    if (t) t.text = trimmed;
    editingId = null;
    save();
    render();
  }

  function cancelEdit() {
    editingId = null;
    render();
  }

  function toggleAll() {
    if (!todos.length) return;
    const allDone = activeCount() === 0;
    todos.forEach((t) => {
      t.completed = !allDone;
    });
    save();
    render();
  }

  function clearCompleted() {
    todos = todos.filter((t) => !t.completed);
    save();
    render();
  }

  function renderItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' is-completed' : '');
    li.dataset.id = todo.id;

    const checkId = 'todo-check-' + todo.id;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.id = checkId;
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', 'Mark "' + todo.text + '" as ' + (todo.completed ? 'incomplete' : 'complete'));
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    if (editingId === todo.id) {
      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'todo-edit-input';
      editInput.value = todo.text;
      editInput.setAttribute('data-edit-input', todo.id);
      editInput.setAttribute('aria-label', 'Edit todo');
      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitEdit(todo.id, editInput.value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          skipEditBlur = true;
          cancelEdit();
        }
      });
      editInput.addEventListener('blur', () => {
        if (skipEditBlur) {
          skipEditBlur = false;
          return;
        }
        commitEdit(todo.id, editInput.value);
      });

      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      li.appendChild(checkbox);
      li.appendChild(editInput);
      li.appendChild(actions);
    } else {
      const textSpan = document.createElement('span');
      textSpan.className = 'todo-text';
      textSpan.textContent = todo.text;
      textSpan.addEventListener('dblclick', () => startEdit(todo.id));

      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', 'Edit "' + todo.text + '"');
      editBtn.addEventListener('click', () => startEdit(todo.id));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = 'Delete';
      delBtn.setAttribute('aria-label', 'Delete "' + todo.text + '"');
      delBtn.addEventListener('click', () => deleteTodo(todo.id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      li.appendChild(checkbox);
      li.appendChild(textSpan);
      li.appendChild(actions);
    }

    return li;
  }

  function render() {
    listEl.replaceChildren();
    visibleTodos().forEach((t) => listEl.appendChild(renderItem(t)));
    updateChrome();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTodo(input.value);
  });

  toggleAllBtn.addEventListener('click', toggleAll);
  clearCompletedBtn.addEventListener('click', clearCompleted);

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  load();
  render();
})();
