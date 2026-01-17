#!/usr/bin/env node

/**
 * GOOGLE JULES - VTC SETUP GENERATOR
 * Generates setup-jules-vtc.sh (Includes VTC Data Seed).
 */

const fs = require('fs');
const path = require('path');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function escapeForHeredoc(content) {
  if (!content) return '';
  return content
    .replace(/\\/g, '\\\\')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

function readEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
        log(`📖 Reading ${filePath}...`);
        const content = fs.readFileSync(filePath, 'utf-8');
        log(`✅ ${filePath} read successfully (${content.length} characters)`);
        return content;
    }
    log(`⚠️ Warning: File not found ${filePath}`);
    return '';
  } catch (error) {
    log(`⚠️ Warning: Could not read ${filePath}: ${error}`);
    return '';
  }
}

function main() {
  console.log('🚀 GOOGLE JULES - VTC SETUP GENERATOR (COMPLETE)');
  console.log('================================================');
  console.log('');

  try {
    const rootEnvContent = readEnvFile(path.join(process.cwd(), '.env'));
    const dbEnvPath = path.join(process.cwd(), 'packages', 'database', '.env');
    let dbEnvContent = '';
    if (fs.existsSync(dbEnvPath)) {
        dbEnvContent = readEnvFile(dbEnvPath);
    }

    const escapedRootEnv = escapeForHeredoc(rootEnvContent);
    const escapedDbEnv = escapeForHeredoc(dbEnvContent);

    const setupScriptLines = [
      '#!/bin/bash',
      '',
      '# GOOGLE JULES - VTC SETUP SCRIPT (COMPLETE)',
      `# Generated: ${new Date().toISOString()}`,
      '',
      'set -e',
      '',
      'log_message() {',
      '    echo "[$(date \'+%Y-%m-%d %H:%M:%S\')] $1"',
      '}',
      '',
      'handle_error() {',
      '    local exit_code=$?',
      '    log_message "❌ ERROR: Command failed with exit code $exit_code"',
      '    log_message "📍 Location: Line $1 of setup script"',
      '    exit $exit_code',
      '}',
      '',
      'trap \'handle_error $LINENO\' ERR',
      '',
      '# 1. Environment Verification',
      'log_message "🔍 Verifying environment..."',
      '',
      'if ! command -v node >/dev/null 2>&1; then',
      '    log_message "❌ Node.js not found. Installing..."',
      '    exit 1',
      'fi',
      'log_message "✅ Node.js: $(node -v)"',
      '',
      'if ! command -v pnpm >/dev/null 2>&1; then',
      '    log_message "📥 Installing pnpm..."',
      '    curl -fsSL https://get.pnpm.io/install.sh | sh -',
      '    export PNPM_HOME="$HOME/.local/share/pnpm"',
      '    export PATH="$PNPM_HOME:$PATH"',
      '    hash -r 2>/dev/null || true',
      'fi',
      'log_message "✅ pnpm: $(pnpm -v)"',
      '',
      '# 2. Clone Repository (or detect existing)',
      'PROJECT_DIR="sixieme-etoile-nextjs16"',
      'REPO_URL="git@github.com:JoPadOfficiel/sixieme-etoile-nextjs16.git"',
      '',
      '# Check if we are already inside the project directory (Jules pre-clones to /app)',
      'if [ -f "package.json" ] && grep -q "supastarter-nextjs" package.json 2>/dev/null; then',
      '    log_message "📂 Already inside project directory, skipping clone."',
      'elif [ -d "$PROJECT_DIR" ]; then',
      '    log_message "📂 Directory $PROJECT_DIR exists, entering..."',
      '    cd "$PROJECT_DIR"',
      'else',
      '    log_message "📥 Cloning repository..."',
      '    git clone "$REPO_URL" "$PROJECT_DIR"',
      '    cd "$PROJECT_DIR"',
      'fi',
      '',
      '# 3. Setup Environment Variables',
      'log_message "📝 Setting up environment variables..."',
      '',
    ];

    if (rootEnvContent) {
      setupScriptLines.push(
        '# Restore root .env',
        'cat > .env << \'EOF\'',
        escapedRootEnv,
        'EOF',
        'log_message "✅ Created root .env"',
        ''
      );
    }

    if (dbEnvContent) {
      setupScriptLines.push(
        '# Restore packages/database/.env',
        'mkdir -p packages/database',
        'cat > packages/database/.env << \'EOF\'',
        escapedDbEnv,
        'EOF',
        'log_message "✅ Created packages/database/.env"',
        ''
      );
    }
    
    setupScriptLines.push(
      '# Ensure apps/web/.env symlink',
      'mkdir -p apps/web',
      'if [ ! -L "apps/web/.env" ] && [ ! -f "apps/web/.env" ]; then',
      '    ln -sf ../../.env apps/web/.env',
      '    log_message "✅ Linked apps/web/.env -> ../../.env"',
      'fi',
      '',
      '# 4. Install Dependencies',
      'log_message "📦 Installing dependencies..."',
      'pnpm install',
      '',
      '# 4.5. Database Provisioning (Non-Fatal)',
      'log_message "🐳 Checking Database availability..."',
      '(',
      '  # Run in subshell to prevent errors from stopping the script',
      '  set +e  # Disable exit on error for this block',
      '  ',
      '  if ! command -v docker >/dev/null 2>&1; then',
      '    log_message "ℹ️ Docker not available, assuming external database."',
      '    exit 0',
      '  fi',
      '  ',
      '  # Check if we can access docker (with or without sudo)',
      '  if docker info >/dev/null 2>&1; then',
      '    DOCKER_CMD="docker"',
      '  elif sudo docker info >/dev/null 2>&1; then',
      '    DOCKER_CMD="sudo docker"',
      '  else',
      '    log_message "⚠️ Cannot access Docker daemon (permission denied). Assuming external database."',
      '    exit 0',
      '  fi',
      '  ',
      '  # Check if container exists',
      '  if ! $DOCKER_CMD ps -a --format "{{.Names}}" 2>/dev/null | grep -q "vtc-postgres"; then',
      '    log_message "🚀 Starting PostgreSQL container..."',
      '    $DOCKER_CMD run -d \\',
      '      --name vtc-postgres \\',
      '      -e POSTGRES_PASSWORD=postgres \\',
      '      -e POSTGRES_USER=postgres \\',
      '      -e POSTGRES_DB=vtc_sixiemme_etoile \\',
      '      -p 5432:5432 \\',
      '      postgres:15 || { log_message "⚠️ Failed to start container, assuming external database."; exit 0; }',
      '  else',
      '    log_message "ℹ️ Container vtc-postgres already exists. Ensuring it is started..."',
      '    $DOCKER_CMD start vtc-postgres 2>/dev/null || true',
      '  fi',
      '  ',
      '  log_message "⏳ Waiting for Database to accept connections..."',
      '  for i in $(seq 1 30); do',
      '    if $DOCKER_CMD exec vtc-postgres pg_isready -U postgres >/dev/null 2>&1; then',
      '      log_message "✅ Database is ready!"',
      '      exit 0',
      '    fi',
      '    sleep 2',
      '  done',
      '  log_message "⚠️ Database readiness check timed out, continuing anyway..."',
      ') || log_message "ℹ️ Database provisioning skipped or encountered issues."',
      '',
      '# 5. Database Setup',
      'log_message "🗄️ Setting up database..."',
      '# We use exec to run independently of package.json scripts presence',
      'if pnpm --filter @repo/database exec -- dotenv -c -e ../../.env -- prisma migrate deploy; then',
      '    log_message "✅ Migrations deployed"',
      'else',
      '    log_message "⚠️ Migration deploy failed, trying db push..."',
      '    pnpm --filter @repo/database exec -- dotenv -c -e ../../.env -- prisma db push --skip-generate',
      'fi',
      '',
      'pnpm --filter @repo/database generate',
      'log_message "✅ Prisma client generated"',
      '',
      '# 6. Seed VTC Data',
      'log_message "🌱 Seeding VTC Data..."',
      'pnpm --filter @repo/database db:seed:vtc',
      'log_message "✅ VTC Data Seeded"',
      '',
      'log_message "🎉 COMPLETE SETUP FINISHED (With VTC Data)!"',
      'log_message "⚠️ IMPORTANT: Check the logs above for the ADMIN CREDENTIALS (email/password) generated by the seed script."',
      'log_message "   You will need these to log in to the application."'
    );

    const outputDir = path.join(process.cwd(), '.gemini', 'jules', 'env');
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const setupPath = path.join(outputDir, 'setup-jules-vtc.sh');
    fs.writeFileSync(setupPath, setupScriptLines.join('\n'), 'utf-8');

    log('');
    log('✅ Successfully generated VTC (Complete) setup script!');
    log(`   - ${setupPath}`);
    log('');
    
  } catch (error) {
    log(`❌ ERROR: ${error}`);
    process.exit(1);
  }
}

main();
