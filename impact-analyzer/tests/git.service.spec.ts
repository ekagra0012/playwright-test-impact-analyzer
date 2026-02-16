
import { GitService } from '../src/services/git.service';

describe('GitService', () => {
    let gitService: GitService;

    beforeEach(() => {
        gitService = new GitService();
    });

    it('should validate 7-character commit SHA', () => {
        const isValid = gitService.validateSHA('75cdcc5');
        expect(isValid).toBe(true);
    });

    it('should validate full 40-character commit SHA', () => {
        const isValid = gitService.validateSHA('75cdcc500d437c355f3096d2039755433fd8159d');
        expect(isValid).toBe(true);
    });

    it('should invoke git diff command correctly', async () => {
        // Mock execution would go here in a real test
        const diff = await gitService.getDiff('HEAD');
        expect(diff).toBeDefined();
    });
});
