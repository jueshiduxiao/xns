var stringHelper = {
    regexpReplace: function (ostr, rule, nstr) {
        var result = ostr.match(rule);

        if (!result) {
            return nstr;
        }

        var arr = nstr.split(/\$/);
        var narr = [];
        arr.forEach(function (item, i) {
            if (i === 0) {
                narr.push(item);
                return;
            }

            var reg = item.match(/^(\d)/);
            if (reg) {
                narr.push(result[reg[1]] + item.substring(reg.index + 1, item.length));
            } else {
                narr.push('$' + item);
            }
        });

        return narr.join('');
    }
};

module.exports = stringHelper;